import React, { useState } from "react";
import { UserProfile, db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { 
  User, 
  Briefcase, 
  HelpCircle, 
  FileText, 
  X, 
  Check, 
  Loader, 
  Mail,
  ShieldCheck
} from "lucide-react";

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function ProfileModal({ profile, onClose, onUpdateProfile }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [occupation, setOccupation] = useState(profile.occupation || "Student");
  const [gender, setGender] = useState(profile.gender || "Prefer not to say");
  const [description, setDescription] = useState(profile.description || "");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedData = {
        displayName: displayName.trim(),
        occupation,
        gender,
        description: description.trim(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (profile.uid && profile.uid !== "local_user") {
          const userRef = doc(db, "users", profile.uid);
          await updateDoc(userRef, updatedData);
        }
      } catch (e) {
        console.warn("Could not save to Firestore, using local storage fallback", e);
      }

      // Save to local storage for persistent profile settings
      localStorage.setItem("focus_ai_user_profile", JSON.stringify({
        ...profile,
        ...updatedData
      }));

      onUpdateProfile({
        ...profile,
        ...updatedData
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Profile Settings</h3>
              <p className="text-[10px] text-slate-400">Manage database-backed scholar identity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Read Only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Email Address (Read Only)
            </label>
            <div className="relative opacity-60">
              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                disabled
                value={profile.email}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-400 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Account Holder Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                id="edit_profile_name"
                type="text"
                required
                placeholder="Alex Chen"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Occupation and Gender Dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Occupation
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <select
                  id="edit_profile_occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Professional">Professional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Gender
              </label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <select
                  id="edit_profile_gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description / Bio */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Account Description / Bio
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <textarea
                id="edit_profile_description"
                placeholder="Write a brief account description or your learning goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-400 text-[10px] text-center font-semibold pt-1">
              {error}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-300 rounded-xl text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              id="save_profile_btn"
              type="submit"
              disabled={loading || success}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                success 
                  ? "bg-emerald-600 text-white" 
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : success ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Saved!
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
