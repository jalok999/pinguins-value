const SUPABASE_URL = "https://fjrngfclkekaxfxxqahr.supabase.co";
const SUPABASE_KEY = "sb_publishable_fvSI6jZPe1Ta2KLbtxvyzw_EZF-GkSN";
const ADMIN_UID = "f94d82fb-ba33-499d-ae42-2ece6d57d86b";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);