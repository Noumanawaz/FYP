# MongoDB Atlas MCP Setup

This project uses MongoDB Atlas MCP (Model Context Protocol) for MongoDB communication.

## Configuration

The MCP configuration is located at `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "MongoDB": {
      "command": "npx",
      "args": [
        "-y",
        "mongodb-mcp-server",
        "--connectionString",
        "mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/",
        "--readOnly"
      ]
    }
  }
}
```

## Connection String

**MongoDB Atlas Connection:**
```
mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/
```

**Database Name:** `restaurant_rag`

## Collections

The following collections are used in MongoDB Atlas:

1. **order_history** - Complete order history with status changes
2. **audit_logs** - System audit trail
3. **system_logs** - Application logs

## Using MCP in Cursor

Once configured, you can use MongoDB MCP commands in Cursor:

- Query collections
- View database structure
- Analyze data
- Get collection statistics

## MongoDB Collections Schema

### order_history
```javascript
{
  order_id: String (unique, indexed),
  user_id: String (indexed),
  restaurant_id: String (indexed),
  restaurant_name: String,
  order_data: Object (complete order object),
  status_changes: Array<{
    status: String,
    changed_at: Date,
    changed_by: String?,
    notes: String?
  }>,
  created_at: Date (indexed),
  updated_at: Date
}
```

### audit_logs
```javascript
{
  action: String (indexed),
  entity_type: String (indexed),
  entity_id: String (indexed),
  user_id: String (indexed),
  changes: Object,
  ip_address: String?,
  user_agent: String?,
  created_at: Date (indexed)
}
```

### system_logs
```javascript
{
  level: String (enum: info, warn, error, debug, indexed),
  message: String,
  context: Object?,
  stack: String?,
  created_at: Date (indexed)
}
```

## Direct MongoDB Connection

For direct MongoDB operations (outside MCP), use:

```bash
mongosh "mongodb+srv://cluster0.vde4x5f.mongodb.net/" \
  --apiVersion 1 \
  --username noumannawaz2004_db_user \
  --password Amadahmad1975
```

Then:
```javascript
use restaurant_rag
db.order_history.find().limit(5)
db.audit_logs.find().sort({created_at: -1}).limit(10)
```

## Environment Variable

The backend uses this connection string in `.env`:
```env
MONGODB_URI=mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority
```

## Security Notes

⚠️ **Important:**
- The connection string contains credentials
- Keep `.cursor/mcp.json` in `.gitignore` if it contains sensitive data
- Consider using environment variables for production
- The MCP server is configured with `--readOnly` flag for safety

## Troubleshooting

### MCP Not Working
1. Ensure `mongodb-mcp-server` package is available via npx
2. Check MongoDB Atlas IP whitelist
3. Verify connection string is correct
4. Check Cursor MCP settings

### Connection Issues
- Verify IP is whitelisted in MongoDB Atlas
- Check network connectivity
- Verify credentials are correct
- Check MongoDB Atlas cluster status

