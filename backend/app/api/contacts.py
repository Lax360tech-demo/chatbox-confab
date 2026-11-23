from datetime import datetime, timezone
import re
from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user_id
from app.schemas.contact import ContactCreateRequest, ContactUpdateRequest, ContactResponse, CategoryCreateRequest, CategoryResponse
from app.utils.helpers import clean_phone_number, validate_phone_number, get_phone_search_filter, serialize_doc

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("/check-registration")
async def check_registration(phone: str = Query(..., description="Mobile number to check")):
    db = get_database()
    filter_q = get_phone_search_filter(phone)
    user = await db.users.find_one(filter_q)
    if user:
        return {
            "is_registered": True,
            "user": {
                "id": str(user["_id"]),
                "full_name": user.get("full_name"),
                "username": user.get("username"),
                "profile_picture": user.get("profile_picture", ""),
                "signature_emoji": user.get("signature_emoji", "🚀"),
                "about": user.get("about", ""),
                "phone_number": user.get("phone_number")
            }
        }
    return {"is_registered": False, "user": None}

@router.post("", response_model=ContactResponse)
async def add_contact(req: ContactCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    
    # 1. Clean and validate phone number
    normalized_phone = clean_phone_number(req.country_code, req.mobile_number)
    if not validate_phone_number(normalized_phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid mobile number."
        )

    # 2. Check if user is adding their own number
    my_user = await db.users.find_one({"_id": ObjectId(current_user_id) if ObjectId.is_valid(current_user_id) else current_user_id})
    if my_user and my_user.get("phone_number") == normalized_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add your own mobile number as a contact."
        )

    # 3. Check whether mobile number belongs to an existing registered Confab user
    registered_user = await db.users.find_one(get_phone_search_filter(normalized_phone))

    # 4. Check if contact already saved by this user
    phone_filter = get_phone_search_filter(normalized_phone)
    phone_filter["owner_id"] = current_user_id
    existing_contact = await db.contacts.find_one(phone_filter)
    
    if existing_contact:
        # Instead of blocking the user, refresh and update the existing contact's registration status!
        update_data = {
            "updated_at": datetime.now(timezone.utc),
            "contact_name": req.contact_name.strip() or existing_contact.get("contact_name")
        }
        if registered_user:
            update_data["registration_status"] = "registered"
            update_data["registered_user_id"] = str(registered_user["_id"])
            update_data["phone_number"] = registered_user.get("phone_number", normalized_phone)
        
        await db.contacts.update_one({"_id": existing_contact["_id"]}, {"$set": update_data})
        updated = await db.contacts.find_one({"_id": existing_contact["_id"]})
        updated["id"] = str(updated["_id"])
        if registered_user:
            updated["profile_picture"] = registered_user.get("profile_picture", "")
            updated["username"] = registered_user.get("username", "")
            updated["signature_emoji"] = registered_user.get("signature_emoji", "🚀")
            updated["about"] = registered_user.get("about", "")
            updated["online_status"] = registered_user.get("online_status", False)
            updated["last_seen"] = registered_user.get("last_seen").isoformat() if registered_user.get("last_seen") else None
        return serialize_doc(updated)

    now = datetime.now(timezone.utc)
    contact_doc = {
        "owner_id": current_user_id,
        "contact_name": req.contact_name.strip(),
        "phone_number": registered_user["phone_number"] if registered_user else normalized_phone,
        "country_code": req.country_code.strip(),
        "registered_user_id": str(registered_user["_id"]) if registered_user else None,
        "registration_status": "registered" if registered_user else "unregistered",
        "categories": req.categories or [],
        "created_at": now,
        "updated_at": now
    }

    insert_result = await db.contacts.insert_one(contact_doc)
    contact_doc["id"] = str(insert_result.inserted_id)

    # Enrich with profile info if registered
    if registered_user:
        contact_doc["profile_picture"] = registered_user.get("profile_picture", "")
        contact_doc["username"] = registered_user.get("username", "")
        contact_doc["signature_emoji"] = registered_user.get("signature_emoji", "🚀")
        contact_doc["about"] = registered_user.get("about", "")
        contact_doc["online_status"] = registered_user.get("online_status", False)
        contact_doc["last_seen"] = registered_user.get("last_seen").isoformat() if registered_user.get("last_seen") else None

    return serialize_doc(contact_doc)

@router.get("", response_model=list[ContactResponse])
async def list_contacts(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    cursor = db.contacts.find({"owner_id": current_user_id}).sort("contact_name", 1)
    contacts = await cursor.to_list(length=1000)

    results = []
    for c in contacts:
        c["id"] = str(c["_id"])
        
        # Check if registered user exists (auto-update if registered meanwhile)
        if c.get("phone_number"):
            was_unregistered = c.get("registration_status") != "registered" or not c.get("registered_user_id")
            registered_user = await db.users.find_one(get_phone_search_filter(c["phone_number"]))
            if registered_user:
                reg_id_str = str(registered_user["_id"])
                c["registration_status"] = "registered"
                c["registered_user_id"] = reg_id_str
                c["profile_picture"] = registered_user.get("profile_picture", "")
                c["username"] = registered_user.get("username", "")
                c["signature_emoji"] = registered_user.get("signature_emoji", "🚀")
                c["about"] = registered_user.get("about", "")
                c["online_status"] = registered_user.get("online_status", False)
                c["last_seen"] = registered_user.get("last_seen").isoformat() if registered_user.get("last_seen") else None
                # Persist updated status in MongoDB
                if was_unregistered:
                    await db.contacts.update_one(
                        {"_id": c["_id"]},
                        {"$set": {
                            "registration_status": "registered",
                            "registered_user_id": reg_id_str,
                            "phone_number": registered_user.get("phone_number", c["phone_number"])
                        }}
                    )
            else:
                c["registration_status"] = "unregistered"
                c["registered_user_id"] = None
        
        results.append(serialize_doc(c))
    return results

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, req: ContactUpdateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {
        "_id": ObjectId(contact_id) if ObjectId.is_valid(contact_id) else contact_id,
        "owner_id": current_user_id
    }
    contact = await db.contacts.find_one(query)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if req.contact_name is not None:
        update_fields["contact_name"] = req.contact_name.strip()
    if req.categories is not None:
        update_fields["categories"] = req.categories

    await db.contacts.update_one(query, {"$set": update_fields})
    updated = await db.contacts.find_one(query)
    updated["id"] = str(updated["_id"])

    # Enrich if registered
    if updated.get("registered_user_id"):
        reg_id = ObjectId(updated["registered_user_id"]) if ObjectId.is_valid(updated["registered_user_id"]) else updated["registered_user_id"]
        reg_user = await db.users.find_one({"_id": reg_id})
        if reg_user:
            updated["profile_picture"] = reg_user.get("profile_picture", "")
            updated["username"] = reg_user.get("username", "")
            updated["signature_emoji"] = reg_user.get("signature_emoji", "🚀")
            updated["about"] = reg_user.get("about", "")
            updated["online_status"] = reg_user.get("online_status", False)

    return serialize_doc(updated)

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {
        "_id": ObjectId(contact_id) if ObjectId.is_valid(contact_id) else contact_id,
        "owner_id": current_user_id
    }
    res = await db.contacts.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return {"success": True, "message": "Contact deleted successfully"}

# Contact Categories ("My Lists")
@router.get("/categories/all", response_model=list[CategoryResponse])
async def get_my_categories(current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    cursor = db.categories.find({"user_id": current_user_id})
    cats = await cursor.to_list(length=100)
    # If user has no custom categories yet, initialize defaults: Favorites, Personal, Business, Family, Friends
    if not cats:
        defaults = ["Favorites", "Personal", "Business", "Family", "Friends"]
        now = datetime.now(timezone.utc)
        docs = [{"user_id": current_user_id, "category_name": d, "contact_ids": [], "created_at": now} for d in defaults]
        await db.categories.insert_many(docs)
        cursor = db.categories.find({"user_id": current_user_id})
        cats = await cursor.to_list(length=100)

    results = []
    for c in cats:
        c["id"] = str(c["_id"])
        results.append(serialize_doc(c))
    return results

@router.post("/categories", response_model=CategoryResponse)
async def create_category(req: CategoryCreateRequest, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    cat_name = req.category_name.strip()
    existing = await db.categories.find_one({"user_id": current_user_id, "category_name": cat_name})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")

    new_cat = {
        "user_id": current_user_id,
        "category_name": cat_name,
        "contact_ids": [],
        "created_at": datetime.now(timezone.utc)
    }
    res = await db.categories.insert_one(new_cat)
    new_cat["id"] = str(res.inserted_id)
    return serialize_doc(new_cat)

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user_id: str = Depends(get_current_user_id)):
    db = get_database()
    query = {
        "_id": ObjectId(category_id) if ObjectId.is_valid(category_id) else category_id,
        "user_id": current_user_id
    }
    await db.categories.delete_one(query)
    return {"success": True, "message": "Category deleted"}
