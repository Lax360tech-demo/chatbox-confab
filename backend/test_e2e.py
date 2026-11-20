import httpx
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    client = httpx.Client(timeout=10.0)

    print(">>> 1. Checking Health Check...")
    r = client.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("Health check OK:", r.json())

    # User 1: Raj (+919876543210)
    print("\n>>> 2. Testing OTP Send for User 1...")
    phone1 = "+919876543210"
    r = client.post(f"{BASE_URL}/auth/send-otp", json={"phone_number": phone1})
    assert r.status_code == 200, f"Send OTP failed: {r.text}"
    otp1 = r.json().get("debug_otp", "123456")
    print("OTP 1 received:", otp1)

    print("\n>>> 3. Testing OTP Verify for User 1...")
    r = client.post(f"{BASE_URL}/auth/verify-otp", json={"phone_number": phone1, "otp_code": otp1})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    print("OTP 1 verified successfully!")

    print("\n>>> 4. Registering User 1 (Raj)...")
    r = client.post(f"{BASE_URL}/auth/register", json={
        "full_name": "Rajesh Kumar",
        "username": "rajesh_k",
        "phone_number": phone1,
        "password": "Password123!",
        "signature_emoji": "🚀",
        "about": "Connect Beyond Conversations!"
    })
    if r.status_code == 400 and "already registered" in r.text:
        # Login instead
        r = client.post(f"{BASE_URL}/auth/login", json={"identifier": phone1, "password": "Password123!"})
    assert r.status_code == 200, f"User 1 auth failed: {r.text}"
    user1_data = r.json()
    token1 = user1_data["access_token"]
    user1_id = user1_data["user"]["id"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    print(f"User 1 logged in successfully! ID: {user1_id}, Emoji: {user1_data['user'].get('signature_emoji')}")

    # User 2: Priya (+919876543211)
    print("\n>>> 5. Registering User 2 (Priya)...")
    phone2 = "+919876543211"
    client.post(f"{BASE_URL}/auth/send-otp", json={"phone_number": phone2})
    r = client.post(f"{BASE_URL}/auth/register", json={
        "full_name": "Priya Sharma",
        "username": "priya_s",
        "phone_number": phone2,
        "password": "Password123!",
        "signature_emoji": "✨",
        "about": "Always exploring new frontiers."
    })
    if r.status_code == 400 and "already registered" in r.text:
        r = client.post(f"{BASE_URL}/auth/login", json={"identifier": phone2, "password": "Password123!"})
    assert r.status_code == 200, f"User 2 auth failed: {r.text}"
    user2_data = r.json()
    token2 = user2_data["access_token"]
    user2_id = user2_data["user"]["id"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    print(f"User 2 logged in successfully! ID: {user2_id}, Emoji: {user2_data['user'].get('signature_emoji')}")

    print("\n>>> 6. User 1 adds User 2 as a contact...")
    r = client.post(f"{BASE_URL}/contacts", json={
        "contact_name": "Priya",
        "country_code": "+91",
        "mobile_number": "9876543211",
        "categories": ["Favorites", "Friends"]
    }, headers=headers1)
    if r.status_code == 400 and "already saved" in r.text:
        # Fetch contacts
        contacts_res = client.get(f"{BASE_URL}/contacts", headers=headers1)
        contact_priya = next(c for c in contacts_res.json() if c["phone_number"] == phone2)
    else:
        assert r.status_code == 200, f"Add contact failed: {r.text}"
        contact_priya = r.json()
    assert contact_priya["registration_status"] == "registered", "Expected Priya to be recognized as registered Confab user!"
    print("Contact added & confirmed registered! Username:", contact_priya["username"], "Emoji:", contact_priya["signature_emoji"])

    print("\n>>> 7. User 1 creates/retrieves 1-to-1 conversation with User 2...")
    r = client.post(f"{BASE_URL}/conversations", json={
        "recipient_id": user2_id,
        "type": "private"
    }, headers=headers1)
    assert r.status_code == 200, f"Create conversation failed: {r.text}"
    conv = r.json()
    conv_id = conv["id"]
    print(f"Conversation active! ID: {conv_id}, Participants: {conv['participants']}")

    print("\n>>> 8. User 1 sends real-time message to User 2...")
    r = client.post(f"{BASE_URL}/messages", json={
        "conversation_id": conv_id,
        "message_type": "text",
        "content": "Hello Priya! Welcome to Confab! 🚀"
    }, headers=headers1)
    assert r.status_code == 200, f"Send message failed: {r.text}"
    msg = r.json()
    msg_id = msg["id"]
    print("Message sent:", msg["content"], "Status:", msg["status"])

    print("\n>>> 9. User 2 reacts with emoji to the message...")
    r = client.post(f"{BASE_URL}/messages/{msg_id}/react", json={"emoji": "❤️"}, headers=headers2)
    assert r.status_code == 200, f"Reaction failed: {r.text}"
    print("Reaction updated:", r.json())

    print("\n>>> 10. User 1 pins the message...")
    r = client.post(f"{BASE_URL}/messages/{msg_id}/pin", headers=headers1)
    assert r.status_code == 200, f"Pin failed: {r.text}"
    print("Pin toggled:", r.json())

    print("\n>>> 11. Creating Group Chat with User 1 & User 2...")
    r = client.post(f"{BASE_URL}/groups", json={
        "group_name": "Confab Pioneers 💫",
        "description": "Official pioneers group.",
        "member_ids": [user2_id]
    }, headers=headers1)
    assert r.status_code == 200, f"Group creation failed: {r.text}"
    group_data = r.json()
    group_id = group_data["id"]
    group_conv_id = group_data["conversation_id"]
    print(f"Group created! ID: {group_id}, Group Name: {group_data['group_name']}, Conversation ID: {group_conv_id}")

    print("\n>>> 12. Creating Poll inside Group Chat...")
    r = client.post(f"{BASE_URL}/polls", json={
        "conversation_id": group_conv_id,
        "question": "Which theme do you prefer for Confab?",
        "options": ["Night Mode (Obsidian)", "Ocean Blue", "Forest Green", "Lavender"],
        "allow_multiple": False
    }, headers=headers1)
    assert r.status_code == 200, f"Poll creation failed: {r.text}"
    poll_data = r.json()
    poll_id = poll_data["id"]
    print(f"Poll created! ID: {poll_id}, Question: {poll_data['question']}")

    print("\n>>> 13. User 2 votes in the Poll...")
    r = client.post(f"{BASE_URL}/polls/{poll_id}/vote", json={"option_indices": [0]}, headers=headers2)
    assert r.status_code == 200, f"Poll vote failed: {r.text}"
    voted_poll = r.json()
    print("Poll updated with User 2 vote! Total votes:", voted_poll["total_votes"])

    print("\n>>> 14. Creating 24-hour Chronicle Story...")
    r = client.post(f"{BASE_URL}/stories", json={
        "media_url": "text_mode",
        "media_type": "text",
        "caption": "Launching Confab today! Connect Beyond Conversations 🌟",
        "background_color": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "visibility": "contacts"
    }, headers=headers1)
    assert r.status_code == 200, f"Story creation failed: {r.text}"
    story = r.json()
    story_id = story["id"]
    print(f"Chronicle Story posted! ID: {story_id}, Expires at: {story['expires_at']}")

    print("\n>>> 15. User 2 views and reacts to User 1's story...")
    client.post(f"{BASE_URL}/stories/{story_id}/view", headers=headers2)
    r = client.post(f"{BASE_URL}/stories/{story_id}/react", json={"emoji": "🔥"}, headers=headers2)
    assert r.status_code == 200
    print("Story viewed and reacted successfully!")

    print("\n>>> 16. Switching Themes...")
    r = client.put(f"{BASE_URL}/users/theme", json={"theme": "ocean"}, headers=headers1)
    assert r.status_code == 200
    print("Theme switched to ocean successfully!")

    print("\n=======================================================")
    print("  ALL 16 BACKEND END-TO-END TESTS PASSED SUCCESSFULLY!  ")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
