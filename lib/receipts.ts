// lib/receipts.ts — Receipt capture for Ivory Ledger expenses (v1)
// Photo only, no OCR. Files live in the private "receipts" Supabase
// Storage bucket at <auth_uid>/<timestamp>.jpg; storage RLS policies
// scope every path to its owner. receipt_image_url on the expense row
// stores the storage PATH (not a URL); signed URLs are minted at view
// time so links always expire and can't be shared permanently.
import { supabase } from "./supabase";
import * as ImagePicker from "expo-image-picker";
// Hermes (RN engine) cannot build a Blob from a fetched file, so we read
// the picked photo as base64 and decode it to an ArrayBuffer for upload —
// the pattern Supabase documents for React Native.
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

const BUCKET = "receipts";

export interface PickedReceipt {
  uri: string;
  mimeType: string;
}

/** Ask the user to photograph or pick a receipt photo. Returns null if cancelled. */
export async function pickReceipt(fromCamera: boolean): Promise<PickedReceipt | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.7, // compress at the source — receipts are small text, keeps storage lean
    allowsEditing: false,
  };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" };
}

/** Upload a picked receipt to the private bucket. Returns the storage path. */
export async function uploadReceipt(local: PickedReceipt): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not logged in");
  const path = `${user.id}/${Date.now()}.jpg`;
  const base64 = await FileSystem.readAsStringAsync(local.uri, {
    encoding: "base64",
  });
  const buffer = decode(base64);
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: local.mimeType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Mint a short-lived signed URL so the owner can view their receipt. */
export async function receiptSignedUrl(path: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
