# Testing HiBob Push Feature

## Step 1: Start the Development Server

1. Open a terminal in the project directory
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. The app should open in your browser (usually at `http://localhost:5173`)

## Step 2: Open Browser Developer Tools

**Before testing, open the browser console to see debug logs:**

- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- **Safari**: Enable Developer menu first, then `Cmd+Option+C`

Go to the **Console** tab - this is where you'll see all the debug logs.

## Step 3: Test the Bulk Push Feature

### Option A: Push Existing Goals (Recommended for Testing)

1. **Open the Bulk Creator Modal**
   - Look for an "Admin Bulk Creator" or similar button in the UI
   - Click to open the modal

2. **Navigate to "Sync Existing" Tab**
   - Click on the "Sync Existing" tab in the modal

3. **Configure HiBob Credentials**
   - You should see a "HiBob Credentials" panel
   - Enter your HiBob **Service ID**
   - Enter your HiBob **Service Token**
   - These will be saved automatically

4. **Select Goals to Push**
   - Use the filter box to find specific goals if needed
   - Check the boxes next to the goals you want to push
   - Or click "Select All" to select all visible goals

5. **Push to HiBob**
   - Click the "Push X Selected to HiBob" button
   - The modal will close and the push process will start

### Option B: Create New Goals and Push Immediately

1. **Open Bulk Creator Modal**
2. **Choose "Distribute Goal" or "Rapid List Entry" tab**
3. **Enable "Sync to HiBob" Toggle**
   - Look for the toggle in the top-right area
   - It should turn red when enabled
4. **Enter HiBob Credentials** (if not already saved)
5. **Create your goals** (fill in the form)
6. **Click "Create & Push"** button

## Step 4: Monitor the Console

While the push is running, watch the console for logs like:

```
[HiBob Push] Starting push sequence for 3 goals
[HiBob Push] Config serviceId: abcd...
[HiBob Push] Processing 1/3: Goal Title Here
[HiBob Push] Sending request for: Goal Title Here Owner: John Doe
[HiBob Push] URL (sanitized): https://script.google.com/...?action=PUSH_SINGLE_GOAL&...
[HiBob Push] Response status: 200 Content-Type: application/json
[HiBob Push] Response text (first 500 chars): {"success":true,"message":"Goal Created in HiBob"}
[HiBob Push] Parsed response: {success: true, message: "Goal Created in HiBob"}
```

## Step 5: Check the Results

After the push completes, a **"HiBob Sync Report"** modal should appear showing:

- ✅ **Success count**: Number of goals successfully pushed
- ❌ **Failure count**: Number of goals that failed
- **Detailed list**: Each goal with its status and error message (if any)

## Common Issues & What to Look For

### Issue 1: "HiBob config missing"
- **Solution**: Make sure you've entered credentials in the Bulk Creator modal
- **Check**: Look in localStorage - credentials should be saved automatically

### Issue 2: "Owner 'X' not found in HiBob"
- **Cause**: The owner name doesn't match what's in HiBob
- **Solution**: 
  - Check the exact name format in HiBob
  - Make sure the employee exists in your Employees/Team sheet
  - The name matching is case-insensitive but must be close

### Issue 3: "Could not auto-detect Goal Type ID"
- **Cause**: HiBob requires a goal type, and auto-detection failed
- **Solution**: 
  - Use the HiBob Test feature in Sync Panel to find a Goal Type ID
  - Enter it manually in the HiBob config as `manualGoalType`

### Issue 4: "Invalid JSON response" or HTML error page
- **Cause**: The Google Apps Script URL might be wrong or the script has an error
- **Solution**: 
  - Verify the script URL is correct
  - Check that the script is deployed as "Web app" with "Anyone" access
  - Look at the console for the full error response

### Issue 5: HTTP Error 401/403
- **Cause**: HiBob authentication failed
- **Solution**: 
  - Double-check Service ID and Token
  - Make sure they're not expired
  - Verify they have the correct permissions in HiBob

## Quick Debug Checklist

- [ ] Browser console is open
- [ ] HiBob credentials are entered and saved
- [ ] At least one goal is selected/created
- [ ] Google Apps Script URL is configured
- [ ] Owner names match HiBob employee names
- [ ] Network tab shows requests being sent (optional, for advanced debugging)

## Next Steps After Testing

1. **If it works**: Great! The feature is functioning correctly
2. **If it fails**: 
   - Copy the console logs
   - Note which specific error messages appear
   - Check the Sync Report modal for detailed error messages
   - Share the error details for further debugging

## Advanced: Network Tab Debugging

For even more detail, you can also check the **Network** tab in DevTools:

1. Open DevTools → **Network** tab
2. Filter by "XHR" or "Fetch"
3. Look for requests to your Google Apps Script URL
4. Click on a request to see:
   - Request URL (with all parameters)
   - Response status
   - Response body (the JSON returned)

This can help identify if the issue is with the request format or the response.
