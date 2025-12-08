"use client";

import { useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

interface UseGoogleDrivePickerResult {
  openPicker: () => void;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useGoogleDrivePicker(
  onFilesSelected: (files: DriveFile[], accessToken: string) => void
): UseGoogleDrivePickerResult {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  useEffect(() => {
    if (!clientId || !apiKey) {
      setError("Missing Google API credentials");
      setIsLoading(false);
      return;
    }

    // Load Google API script
    const loadGoogleApi = () => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => initializeGapi();
      script.onerror = () => {
        setError("Failed to load Google API");
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    // Load Google Picker script
    const loadPickerApi = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      document.body.appendChild(script);
    };

    const initializeGapi = () => {
      window.gapi.load("client:picker", async () => {
        try {
          await window.gapi.client.init({
            apiKey: apiKey,
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
            ],
          });
          setIsReady(true);
          setIsLoading(false);
        } catch (err) {
          console.error("Error initializing Google API:", err);
          setError("Failed to initialize Google API");
          setIsLoading(false);
        }
      });
    };

    loadGoogleApi();
    loadPickerApi();
  }, [clientId, apiKey]);

  const authenticate = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId!,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (response: any) => {
          if (response.error) {
            reject(response.error);
          } else {
            setAccessToken(response.access_token);
            resolve(response.access_token);
          }
        },
      });
      tokenClient.requestAccessToken();
    });
  }, [clientId]);

  const openPicker = useCallback(async () => {
    if (!isReady) {
      setError("Google Picker is not ready yet");
      return;
    }

    try {
      let token = accessToken;
      if (!token) {
        token = await authenticate();
      }

      const picker = new window.google.picker.PickerBuilder()
        .setAppId(appId!)
        .setOAuthToken(token)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(
          new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setSelectFolderEnabled(false)
        )
        .setDeveloperKey(apiKey!)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const selectedFiles: DriveFile[] = data.docs.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              sizeBytes: doc.sizeBytes,
            }));
            // Pass the access token along with the files
            onFilesSelected(selectedFiles, token);
          }
        })
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setSize(1051, 650)
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error("Error opening picker:", err);
      setError("Failed to open Google Drive Picker");
    }
  }, [isReady, accessToken, authenticate, apiKey, appId, onFilesSelected]);

  return { openPicker, isReady, isLoading, error };
}
