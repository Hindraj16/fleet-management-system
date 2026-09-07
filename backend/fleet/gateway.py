import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

API_KEY = os.getenv("EXTERNAL_API_KEY")
API_URL = os.getenv("EXTERNAL_API_URL")

def get_external_data():
    # 1. Verify environment variables loaded correctly
    if not API_KEY or not API_URL:
        print("Error: EXTERNAL_API_KEY or EXTERNAL_API_URL is missing in your .env file!")
        return None

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.get(
            API_URL,
            headers=headers,
            timeout=10
        )

        # Triggers HTTPError for 4xx or 5xx codes
        response.raise_for_status()

        data = response.json()
        print("API Request Successful!")
        return data

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP Error Occurred: {http_err}")
        print(f"Response Content: {response.text}")
    except requests.exceptions.ConnectionError:
        print("Connection Error: Unable to reach the server. Check your API_URL or network connection.")
    except requests.exceptions.Timeout:
        print("Timeout Error: The request took longer than 10 seconds.")
    except requests.exceptions.RequestException as err:
        print(f"An unexpected error occurred: {err}")
    
    return None

# Execute test
if __name__ == "__main__":
    result = get_external_data()
    print("Fetched Data:", result)