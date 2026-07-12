import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  ArrowLeft, 
  Camera, 
  Loader2, 
  User, 
  Mail, 
  Lock, 
  CheckCircle, 
  AlertCircle,
  FileText
} from 'lucide-react';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');

  // Status states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size should be less than 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data } = await API.post('/users/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfilePicture(data.imageUrl);
      setSuccessMessage('Profile picture uploaded successfully! Save changes to apply.');
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.message || 'Failed to upload image. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSaving(true);

    try {
      const profileData = {
        name,
        email,
        profilePicture,
      };

      if (password) {
        profileData.password = password;
      }

      const res = await updateProfile(profileData);

      if (res.success) {
        setSuccessMessage('Profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-3 font-semibold text-slate-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">CollabSpace</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Profile Settings</span>
              </div>
            </Link>
          </div>
          
          <div>
            <Link 
              to="/dashboard" 
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 relative z-10 flex flex-col justify-center">
        
        {/* Alerts */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-3 shadow-lg shadow-emerald-500/5 animate-fadeIn">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs flex items-center gap-3 shadow-lg shadow-rose-500/5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-800/85 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-6 md:p-10">
          
          <h1 className="text-2xl font-bold text-white mb-1">Your Profile</h1>
          <p className="text-xs text-slate-400 mb-8">Manage your account information and public profile picture.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profile Image Upload Circle */}
            <div className="flex flex-col items-center gap-3">
              <div 
                onClick={handleImageClick}
                className="relative w-28 h-28 rounded-full border-2 border-slate-800 hover:border-indigo-500 bg-slate-950 flex items-center justify-center cursor-pointer group overflow-hidden shadow-xl transition-all duration-300"
              >
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt={name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-2xl font-bold text-indigo-400">
                    {getInitials(name)}
                  </div>
                )}

                {/* Upload Hover Overlay */}
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300">
                  <Camera className="w-5 h-5 text-white mb-1" />
                  <span className="text-[10px] font-semibold text-slate-300">Change Photo</span>
                </div>

                {/* Uploading Spinner */}
                {isUploading && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button 
                type="button"
                onClick={handleImageClick}
                disabled={isUploading}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors disabled:opacity-50 cursor-pointer"
              >
                {profilePicture ? 'Update Photo' : 'Upload Photo'}
              </button>
              <p className="text-[10px] text-slate-500">Supports PNG, JPG or JPEG. Max size 5MB.</p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/60">
              
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-all font-medium"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-all font-medium"
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> New Password (Optional)
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-all font-medium"
                />
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Confirm New Password
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600 transition-all font-medium"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-800/60">
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving || isUploading}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

          </form>

        </div>

      </main>
    </div>
  );
}
