# Google Drive Integration Setup Guide

This guide will walk you through setting up Google Drive integration for file uploads in your Tequity application.

## Overview

The application now uses Google Drive Picker to allow users to select and upload files directly from their Google Drive instead of uploading from their local computer.

## Prerequisites

- Access to Google Cloud Console
- Existing Google OAuth credentials (already configured for sign-in)

## Step-by-Step Setup

### 1. Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project (the one with your OAuth credentials)
   - Project ID: `910362391880`

### 2. Enable Required APIs

You need to enable two APIs:

#### Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "**Google Drive API**"
3. Click on it and press the **Enable** button
4. Wait for the API to be enabled

#### Enable Google Picker API

1. Still in **APIs & Services** > **Library**
2. Search for "**Google Picker API**"
3. Click on it and press the **Enable** button
4. Wait for the API to be enabled

### 3. Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **API Key**
4. Copy the generated API key
5. Click **Edit API key** (pencil icon) to restrict it:
   - Under **API restrictions**, select **Restrict key**
   - Check the following APIs:
     - Google Drive API
     - Google Picker API
   - Click **Save**

### 4. Update OAuth Consent Screen (if needed)

1. Go to **APIs & Services** > **OAuth consent screen**
2. Add the following scopes if not already present:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.file`
3. Save changes

### 5. Update Your Environment Variables

Update your `.env` and `apps/main/.env` files with the API key:

```env
# Google OAuth Configuration (already configured)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# Google Drive API Configuration (NEW - add these)
NEXT_PUBLIC_GOOGLE_API_KEY=YOUR_API_KEY_HERE
NEXT_PUBLIC_GOOGLE_APP_ID=YOUR_PROJECT_NUMBER_HERE
```

**Important:** Replace the placeholder values with your actual credentials from Google Cloud Console.

### 6. Restart Your Development Server

After updating the environment variables:

```bash
# Stop the current server (Ctrl+C)

# Restart the server
pnpm run dev
```

## How It Works

### User Flow

1. User clicks the **Upload** button in the dashboard
2. A dialog opens with "**Open Google Drive**" button
3. User clicks the button and Google Drive Picker opens
4. User selects one or multiple files from their Google Drive
5. Files are downloaded from Google Drive and uploaded to your backend
6. Files appear in the user's library

### Technical Implementation

- **Hook**: `useGoogleDrivePicker` - Custom React hook that handles Google Drive Picker initialization
- **Component**: `UploadDialog` - Updated to use Google Drive Picker instead of local file input
- **APIs Used**:
  - Google Picker API - For the file selection UI
  - Google Drive API - For downloading selected files

## Testing

1. Log in to your application
2. Navigate to the Dashboard
3. Click the **Upload** button
4. Click **Open Google Drive**
5. Authenticate with Google (if not already authenticated)
6. Select one or more files from your Google Drive
7. Verify that files are downloaded and uploaded successfully

## Troubleshooting

### "Google API not loaded" error

- Make sure the Google API scripts are loading properly
- Check browser console for any script loading errors
- Verify that your internet connection is stable

### "Invalid API Key" error

- Verify that you've copied the correct API key
- Make sure the API key is not restricted to specific IP addresses or domains
- Ensure the Google Picker API and Google Drive API are enabled for your project

### "Authorization failed" error

- Check that your OAuth consent screen includes the required scopes
- Verify that the OAuth client ID matches the one in your `.env` file
- Try signing out and signing in again

### Files not uploading

- Check the browser console for detailed error messages
- Verify that your backend upload API is working correctly
- Ensure the user has permission to download the files from their Google Drive

## Security Notes

1. **API Key**: The API key is public (prefixed with `NEXT_PUBLIC_`) because it's used in the browser. Restrict it to specific APIs only.
2. **OAuth Token**: User's OAuth access token is used to download files from their Google Drive. This token is never sent to your backend.
3. **File Privacy**: Users can only select and upload files they have access to in their own Google Drive.

## Additional Resources

- [Google Picker API Documentation](https://developers.google.com/picker/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
