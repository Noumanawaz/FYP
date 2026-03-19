import requests
import json
import time

URL = "http://localhost:8000/chat"
SESSION_ID = f"test_session_{int(time.time())}"

messages = [
    "Hello, I'm looking for some food. Can you help me?",
    "I'm specifically looking for KFC deals.",
    "Which one of those is the cheapest? Also I'm planning to order for 5 people."
]

print(f"🚀 Starting verification for session: {SESSION_ID}")

for i, msg in enumerate(messages):
    print(f"\n--- Turn {i+1} ---")
    print(f"User: {msg}")
    
    start_time = time.time()
    response = requests.post(URL, json={
        "message": msg,
        "session_id": SESSION_ID
    })
    end_time = time.time()
    
    if response.status_code == 200:
        data = response.json()
        print(f"Assistant: {data['response_en']}")
        print(f"Response Time: {end_time - start_time:.2f}s")
    else:
        print(f"Error: {response.status_code} - {response.text}")

# Finally check if a summary was generated (by checking the health or diagnostic if we want, 
# or just observing subsequent responses)
# For now, we'll just print success if we reach here and the last response made sense.
print("\n✅ Verification sequence complete. Check backend logs for 'Updated summary' outputs.")
