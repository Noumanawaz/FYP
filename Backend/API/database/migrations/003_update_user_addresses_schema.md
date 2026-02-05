# Migration 003: User Addresses Schema Update

## Overview
This migration document describes the updated schema for user addresses to support latitude and longitude coordinates, and multiple addresses per user.

## Current Schema
The `users` table already has an `addresses` column of type `JSONB[]` which supports storing multiple addresses as JSON objects.

## Address Structure
Each address in the `addresses` array should follow this structure:

```json
{
  "id": "unique-address-id",
  "type": "home" | "work" | "other",
  "label": "Address label (e.g., 'Home', 'Office')",
  "street": "Street address or house number",
  "area": "Area or sector",
  "city": "City name",
  "province": "Province or state",
  "postal_code": "Postal or zip code",
  "country": "Country name",
  "lat": 31.5497,
  "lng": 74.3436,
  "address": "Full formatted address string",
  "is_default": true | false
}
```

## Required Fields
- `street` - Street address or house number
- `city` - City name
- `country` - Country name

## Optional Fields
- `id` - Unique identifier for the address
- `type` - Address type (home, work, other)
- `label` - Address label
- `area` - Area or sector
- `province` - Province or state
- `postal_code` - Postal or zip code
- `lat` - Latitude coordinate (decimal number)
- `lng` - Longitude coordinate (decimal number)
- `address` - Full formatted address string
- `is_default` - Whether this is the default address (default: false)

## Example
```json
{
  "name": "John Doe",
  "preferred_language": "en",
  "role": "customer",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securepassword123",
  "addresses": [
    {
      "id": "addr-1",
      "type": "home",
      "label": "Home",
      "street": "123 Main St",
      "area": "Gulberg",
      "city": "Lahore",
      "province": "Punjab",
      "postal_code": "54000",
      "country": "Pakistan",
      "lat": 31.5497,
      "lng": 74.3436,
      "address": "123 Main St, Gulberg, Lahore, Punjab, Pakistan",
      "is_default": true
    },
    {
      "id": "addr-2",
      "type": "work",
      "label": "Office",
      "street": "456 Business Park",
      "area": "DHA",
      "city": "Lahore",
      "province": "Punjab",
      "postal_code": "54000",
      "country": "Pakistan",
      "lat": 31.5204,
      "lng": 74.3587,
      "address": "456 Business Park, DHA, Lahore, Punjab, Pakistan",
      "is_default": false
    }
  ]
}
```

## Notes
- The database schema (JSONB[]) already supports multiple addresses
- No database migration is needed as the column type supports flexible JSON structure
- Latitude and longitude are stored as decimal numbers in the JSON object
- Users can have unlimited addresses
- Only one address should have `is_default: true` (enforced at application level)

