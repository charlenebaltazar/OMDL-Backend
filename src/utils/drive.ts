import { supabase } from "../configs/supabaseClient";

export async function uploadToSupabase(file: Express.Multer.File) {
  const filePath = `medical-records/${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from("medical-records")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage
    .from("medical-records")
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
  };
}

export async function deleteFromSupabase(path: string) {
  const { error } = await supabase.storage
    .from("medical-records")
    .remove([path]);

  if (error) throw new Error(error.message);
}
