import asyncio
import json
import logging
import struct
import redis

# 1. Connect to Redis Broker
redis_client = redis.Redis(host="127.0.0.1", port=6379, db=0)

LISTEN_PORT = 5023
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def push_to_queue(telemetry_data):
    """
    Pushes decoded GPS telemetry directly into the Celery Redis queue.
    Execution time: ~0.5ms
    """
    celery_task_payload = {
        "task": "tracking.tasks.process_gps_telemetry",  # Django task name
        "id": f"gps-{telemetry_data['imei']}-{telemetry_data.get('timestamp')}",
        "args": [telemetry_data],
        "kwargs": {},
    }

    # Push to Celery's default queue in Redis
    redis_client.rpush("celery", json.dumps(celery_task_payload))


class GPSTrackerProtocol:
    def __init__(self):
        self.imei = None

    def decode_login_packet(self, data: bytes) -> bytes:
        imei_bytes = data[4:12]
        self.imei = imei_bytes.hex()
        logging.info(f"📱 Device Login | IMEI: {self.imei}")

        # Send ACK back to tracker
        serial_no = data[12:14]
        ack = bytearray([0x78, 0x78, 0x05, 0x01]) + serial_no + bytearray([0x00, 0x00, 0x0D, 0x0A])
        return bytes(ack)

    def decode_location_packet(self, data: bytes) -> dict:
        try:
            lat_raw = struct.unpack(">I", data[11:15])[0]
            lng_raw = struct.unpack(">I", data[15:19])[0]
            speed = data[19]

            latitude = lat_raw / 1800000.0
            longitude = lng_raw / 1800000.0

            status_byte = data[20] if len(data) > 20 else 0
            ignition = bool(status_byte & 0x01)

            return {
                "imei": self.imei,
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "speed": float(speed),
                "ignition": ignition,
                "fuel": 100,
            }
        except Exception as e:
            logging.error(f"Error parsing location frame: {e}")
            return None


async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    client_address = writer.get_extra_info('peername')
    protocol = GPSTrackerProtocol()

    try:
        while True:
            data = await reader.read(1024)
            if not data:
                break

            if data.startswith(b'\x78\x78'):
                protocol_type = data[3]

                # Login Packet -> Send ACK
                if protocol_type == 0x01:
                    ack_packet = protocol.decode_login_packet(data)
                    writer.write(ack_packet)
                    await writer.drain()

                # Location Packet -> Push to Redis Queue
                elif protocol_type in (0x12, 0x22):
                    if not protocol.imei:
                        continue

                    location_payload = protocol.decode_location_packet(data)
                    
                    if location_payload:
                        # 🚀 PUSH TO REDIS QUEUE INSTANTLY
                        push_to_queue(location_payload)
                        logging.info(f"⚡ Queued GPS Packet for IMEI: {protocol.imei}")

    except Exception as err:
        logging.error(f"Socket Error: {err}")
    finally:
        writer.close()
        await writer.wait_closed()


async def main():
    server = await asyncio.start_server(handle_client, "0.0.0.0", LISTEN_PORT)
    logging.info(f"📡 TCP Gateway Listening on Port {LISTEN_PORT}...")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    asyncio.run(main())