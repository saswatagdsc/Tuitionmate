# Batch Delete Debugging Guide

## How to Test Delete Functionality

### Step 1: Start Both Servers
```bash
# Terminal 1: Start API Server
npm run server

# Terminal 2: Start Frontend Dev Server  
npm run dev -- --host
```

### Step 2: Watch Console Logs
1. **Server Console**: Watch for logs like:
   - "Creating batch with ID: ..."
   - "Batch saved successfully: ..."
   - "Attempting to delete batch with ID: ..."
   - "Successfully deleted batch: ..."

2. **Browser Console** (F12): Watch for logs like:
   - "Delete button clicked for batch ID: ..."
   - "Starting deletion process for ID: ..."
   - "Attempting DELETE request to: ..."
   - "Delete response status: ..."
   - "Batch deleted from DB, updating state for ID: ..."

### Step 3: Create a Test Batch
1. Click "New Batch" button
2. Fill in form:
   - Name: "Test Batch"
   - Subject: "Physics"
   - Days: Select Mon, Wed, Fri
   - Time: 10:00
   - Duration: 45 minutes
3. Click "Create Batch"
4. Check browser console - should see batch ID printed

### Step 4: Delete the Batch
1. Click "Delete" button on the batch card
2. Confirm deletion in popup
3. Watch for:
   - **Browser Console**: All delete logs
   - **Server Console**: Delete logs
   - **UI**: Batch should disappear from the grid

### Common Issues & Solutions

#### Issue 1: Delete Button Shows "Deleting..." but Nothing Happens
**Possible Causes:**
- API_BASE URL is wrong
- Server not running
- Batch ID format mismatch

**Solution:**
- Check browser console for exact error
- Check server is running on port 4000
- Verify batch ID format matches

#### Issue 2: "Batch not found" Error
**Possible Cause:**
- Batch ID stored in state doesn't match MongoDB ID

**Solution:**
- Check server logs when creating batch - note the ID
- Check if that ID exists in MongoDB

#### Issue 3: No Console Logs Appearing
**Possible Causes:**
- Code not deployed
- Browser console closed
- Server not running

**Solution:**
- Hard refresh page (Ctrl+Shift+R)
- Check both console locations (browser + server terminal)
- Verify npm run dev and npm run server are running

### What Should Happen Step-by-Step

```
1. User clicks Delete button
   ↓
2. Browser: "Delete button clicked for batch ID: xyz123"
   ↓
3. Confirmation dialog appears
   ↓
4. User confirms
   ↓
5. Browser: "Starting deletion process for ID: xyz123"
   ↓
6. Browser: "Attempting DELETE request to: /api/batches/xyz123"
   ↓
7. Server: "Attempting to delete batch with ID: xyz123"
   ↓
8. MongoDB: Batch document deleted
   ↓
9. Server: "Successfully deleted batch: xyz123"
   ↓
10. Server sends: { success: true, id: 'xyz123' }
    ↓
11. Browser: "Delete response status: 200 OK"
    ↓
12. Browser: "Batch deleted from DB, updating state for ID: xyz123"
    ↓
13. UI: Batch card disappears from screen
```

## Verify MongoDB Connection

Check if MongoDB is properly connected:
1. Look for this message on server startup: "Connected to MongoDB via Mongoose"
2. If not present, check:
   - .env file has MONGODB_URI set
   - MongoDB service is running
   - Connection string is correct

## Quick Test Command

Run this in browser console to test delete directly:
```javascript
// Replace 'batch_id_here' with actual batch ID
fetch('/api/batches/batch_id_here', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e))
```

## Need More Help?

Check:
1. Browser Network tab (F12 → Network tab) to see DELETE request
2. Server terminal for any error messages
3. MongoDB Atlas / local MongoDB to verify batch exists before delete
