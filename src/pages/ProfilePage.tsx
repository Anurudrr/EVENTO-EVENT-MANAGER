import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Shield, 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  X,
  Edit3,
  Save,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { bookingService } from '../services/bookingService';
import { userService } from '../services/userService';
import { Booking, Service, User } from '../types';
import { DEFAULT_USER_BIO, formatResponseTime, formatVerificationStatus, getErrorMessage, getUserDisplayName } from '../utils';

const ProfilePage: React.FC = () => {
  const { user, updateProfile, syncUser } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wishlist, setWishlist] = useState<Service[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    profilePicture: user?.profilePicture || '',
    upiId: user?.upiId || '',
    businessName: user?.businessName || '',
    businessType: user?.businessType || '',
    businessLocation: user?.businessLocation || '',
    responseTimeHours: user?.responseTimeHours ? String(user.responseTimeHours) : '24',
  });

  useEffect(() => {
    if (!user) return;

    setFormData({
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      profilePicture: user.profilePicture || '',
      upiId: user.upiId || '',
      businessName: user.businessName || '',
      businessType: user.businessType || '',
      businessLocation: user.businessLocation || '',
      responseTimeHours: user.responseTimeHours ? String(user.responseTimeHours) : '24',
    });
    setImageVersion(Date.now());
  }, [user]);

  const currentProfileImage = previewUrl
    || (formData.profilePicture ? withCacheBust(formData.profilePicture, imageVersion) : '')
    || (user?.profilePicture ? withCacheBust(user.profilePicture, imageVersion) : '');

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const setProfilePreview = (file: File) => {
    const isImageMime = file.type ? file.type.toLowerCase().startsWith('image/') : false;
    const isImageExt = /\.(jpe?g|png|webp|jfif|avif|gif)$/i.test(file.name || '');

    if (!isImageMime && !isImageExt) {
      const message = 'Please upload a valid image file (PNG, JPG, WEBP)';
      setErrorMessage(message);
      showToast(message, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return '';
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = 'File size too large (max 5MB)';
      setErrorMessage(message);
      showToast(message, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return '';
    }

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedProfileImage(file);
    setPreviewUrl(objectUrl);
    setErrorMessage(null);
    return objectUrl;
  };

  const handleProfileImageUpload = async (file: File) => {
    const objectUrl = setProfilePreview(file);

    if (!objectUrl) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploadResponse = await userService.uploadProfileImage(file);
      const uploadedProfilePicture = uploadResponse.user?.profilePicture || uploadResponse.imageUrl;

      if (!uploadedProfilePicture) {
        throw new Error('Profile picture upload did not return an image URL');
      }

      const version = Date.now();
      const bustedUrl = withCacheBust(uploadedProfilePicture, version);

      setFormData((current) => ({
        ...current,
        profilePicture: bustedUrl,
        ...(uploadResponse.user ? {
          name: uploadResponse.user.name || current.name,
          email: uploadResponse.user.email || current.email,
          bio: uploadResponse.user.bio || current.bio,
          upiId: uploadResponse.user.upiId || current.upiId,
          businessName: uploadResponse.user.businessName || current.businessName,
          businessType: uploadResponse.user.businessType || current.businessType,
          businessLocation: uploadResponse.user.businessLocation || current.businessLocation,
          responseTimeHours: uploadResponse.user.responseTimeHours ? String(uploadResponse.user.responseTimeHours) : current.responseTimeHours,
        } : {}),
      }));

      if (uploadResponse.user) {
        syncUser({
          ...uploadResponse.user,
          profilePicture: bustedUrl,
        });
      }

      setImageVersion(version);
      setSuccessMessage('Profile picture updated successfully!');
      showToast('Profile picture updated successfully', 'success');
      setSelectedProfileImage(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to upload profile picture');
      setPreviewUrl(null);
      setSelectedProfileImage(null);
      setErrorMessage(message);
      showToast(message, 'error');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleProfileImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleProfileImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalProfilePicture = formData.profilePicture;

      if (selectedProfileImage) {
        try {
          const uploadResponse = await userService.uploadProfileImage(selectedProfileImage);
          finalProfilePicture = uploadResponse.user?.profilePicture || uploadResponse.imageUrl || finalProfilePicture;
        } catch (uploadErr) {
          console.error('[profile:submit:image-upload]', uploadErr);
        }
      }

      const profilePayload: Partial<User> = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        profilePicture: finalProfilePicture,
      };

      if (user?.role === 'organizer') {
        const trimmedUpi = (formData.upiId || '').trim();
        const trimmedBusinessName = (formData.businessName || '').trim();
        const trimmedBusinessType = (formData.businessType || '').trim();
        const trimmedBusinessLocation = (formData.businessLocation || '').trim();
        const parsedResponseTimeHours = Number(formData.responseTimeHours || 24);
        if (trimmedUpi && !/^[\w.-]{2,}@[A-Za-z]{2,}$/.test(trimmedUpi)) {
          setErrorMessage('Please enter a valid UPI ID (e.g. name@bank)');
          setIsUploading(false);
          return;
        }
        if (!Number.isFinite(parsedResponseTimeHours) || parsedResponseTimeHours < 1 || parsedResponseTimeHours > 168) {
          setErrorMessage('Response time must be between 1 and 168 hours');
          setIsUploading(false);
          return;
        }
        profilePayload.upiId = trimmedUpi;
        profilePayload.businessName = trimmedBusinessName;
        profilePayload.businessType = trimmedBusinessType;
        profilePayload.businessLocation = trimmedBusinessLocation;
        profilePayload.responseTimeHours = parsedResponseTimeHours;
      }

      const updated = await updateProfile(profilePayload);
      const version = Date.now();
      setImageVersion(version);
      if (updated) {
        syncUser({
          ...updated,
          profilePicture: withCacheBust(updated.profilePicture, version),
        });
      }
      setSuccessMessage('Profile updated successfully!');
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
      setSelectedProfileImage(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to update profile');
      setErrorMessage(message);
      showToast(message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeProfilePicture = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedProfileImage(null);
    setFormData((prev) => ({ ...prev, profilePicture: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImageVersion(Date.now());
  };

  const resetEditingState = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setSelectedProfileImage(null);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      profilePicture: user?.profilePicture || '',
      upiId: user?.upiId || '',
      businessName: user?.businessName || '',
      businessType: user?.businessType || '',
      businessLocation: user?.businessLocation || '',
      responseTimeHours: user?.responseTimeHours ? String(user.responseTimeHours) : '24',
    });
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadProfileMeta = async () => {
      if (!user) return;

      try {
        const [bookingData, wishlistData] = await Promise.all([
          bookingService.getMyBookings(),
          userService.getWishlist(),
        ]);

        if (mounted) {
          setBookings(bookingData);
          setWishlist(wishlistData);
        }
      } catch {
        setBookings([]);
        setWishlist([]);
      }
    };

    loadProfileMeta();

    return () => {
      mounted = false;
    };
  }, [user]);

  const profileStats = useMemo(() => ([
    { label: 'Bookings', value: bookings.length.toString() },
    { label: 'Accepted', value: bookings.filter((booking) => booking.status === 'accepted').length.toString() },
    { label: 'Saved Services', value: wishlist.length.toString() },
  ]), [bookings, wishlist]);
  const verificationStatus = user?.verificationStatus || 'unverified';
  const verificationTone = verificationStatus === 'verified'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
    : verificationStatus === 'pending'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
      : verificationStatus === 'rejected'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-600'
        : 'border-noir-border bg-noir-bg text-noir-accent';

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-noir-bg relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[60%] bg-noir-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[50%] bg-noir-accent/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 noir-pattern opacity-10" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 bg-noir-card border-noir-border rounded-none">
              <CardBody className="flex flex-col items-center text-center">
                <div className="relative group mb-6">
                  <Avatar 
                    src={currentProfileImage} 
                    name={getUserDisplayName(user)} 
                    size="2xl"
                    className="ring-4 ring-noir-accent/10 rounded-none"
                  />
                  
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      fileInputRef.current?.click();
                    }}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-noir-accent text-noir-bg rounded-none flex items-center justify-center shadow-lg hover:scale-110 transition-transform border border-noir-bg"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <h2 className="text-2xl font-display font-semibold text-noir-ink mb-1 uppercase tracking-wide">
                  {getUserDisplayName(user)}
                </h2>
                <div className="flex items-center gap-2 text-noir-muted mb-4">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-mono">{user.email}</span>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-noir-bg border border-noir-border rounded-none text-noir-accent text-[10px] font-mono font-semibold uppercase tracking-wider mb-6">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </div>

                {user.role === 'organizer' && (
                  <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-semibold uppercase tracking-[0.28em] ${verificationTone}`}>
                    <Shield className="w-3 h-3" />
                    {formatVerificationStatus(verificationStatus)}
                  </div>
                )}

                <p className="text-noir-muted text-sm leading-relaxed mb-8 italic">
                  {user.bio || DEFAULT_USER_BIO}
                </p>

                <div className="w-full space-y-3">
                  <Button 
                    variant={isEditing ? "ghost" : "primary"}
                    className={`w-full !rounded-none uppercase font-display tracking-widest ${isEditing ? 'text-noir-accent hover:bg-noir-accent/10' : 'btn-noir'}`}
                    onClick={() => {
                      if (isEditing) {
                        resetEditingState();
                        setIsEditing(false);
                        return;
                      }

                      setIsEditing(true);
                    }}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel Editing
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Edit Section */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="edit-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="bg-noir-card border-noir-border rounded-none">
                    <CardHeader>
                      <h3 className="text-xl font-display font-semibold text-noir-ink uppercase tracking-wide">
                        Edit Profile Information
                      </h3>
                      <p className="text-noir-muted text-sm uppercase tracking-normal">Update your personal details and profile picture</p>
                    </CardHeader>
                    <CardBody>
                      <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Image Upload Area */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                            Profile Picture
                          </label>
                          <div 
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="relative border border-dashed border-noir-border rounded-none p-8 text-center hover:border-noir-accent transition-colors group cursor-pointer bg-noir-bg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 bg-noir-card rounded-none flex items-center justify-center text-noir-accent group-hover:scale-110 transition-transform border border-noir-border">
                                <Upload className="w-8 h-8" />
                              </div>
                              <div>
                                <p className="text-noir-accent font-semibold uppercase tracking-widest text-xs">Click or drag to upload</p>
                                <p className="text-noir-muted/50 text-[10px] mt-1 uppercase">PNG, JPG up to 5MB</p>
                              </div>
                            </div>
                          </div>
                          
                          {currentProfileImage && (
                            <div className="flex items-center gap-4 p-4 bg-noir-bg border border-noir-border rounded-none animate-in fade-in slide-in-from-top-2">
                              <Avatar src={currentProfileImage} size="md" className="rounded-none" />
                              <div className="flex-grow">
                                <p className="text-sm font-semibold text-noir-accent uppercase tracking-widest">Current Preview</p>
                                <p className="text-xs text-noir-muted uppercase">This will be your new profile picture</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:bg-red-500/10 !rounded-none"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProfilePicture();
                                }}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">Full Name</label>
                            <input 
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                              placeholder="Your Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">Email Address</label>
                            <input 
                              value={formData.email}
                              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink opacity-60 cursor-not-allowed"
                              placeholder="your@email.com"
                              disabled
                            />
                          </div>
                        </div>

                        {user?.role === 'organizer' && (
                          <div className="space-y-6 border border-noir-border bg-noir-bg p-6">
                            <div>
                              <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em]">
                                Organizer verification profile
                              </p>
                              <p className="mt-2 text-sm uppercase tracking-wide text-noir-muted">
                                Complete these details to submit your organizer profile for business, policy, and payout review.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                                  Business Name
                                </label>
                                <input
                                  value={formData.businessName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                                  className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                                  placeholder="Studio or business name"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                                  Business Type
                                </label>
                                <input
                                  value={formData.businessType}
                                  onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                                  className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                                  placeholder="Example: Wedding planner"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                                  Business Location
                                </label>
                                <input
                                  value={formData.businessLocation}
                                  onChange={(e) => setFormData(prev => ({ ...prev, businessLocation: e.target.value }))}
                                  className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                                  placeholder="Primary operating city"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                                  Response SLA (Hours)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="168"
                                  value={formData.responseTimeHours}
                                  onChange={(e) => setFormData(prev => ({ ...prev, responseTimeHours: e.target.value }))}
                                  className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                                  placeholder="24"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                                UPI ID (Payment Collection)
                              </label>
                              <input 
                                value={formData.upiId}
                                onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
                                className="w-full bg-noir-bg border border-noir-border rounded-none px-6 py-4 text-noir-ink focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all placeholder:text-noir-muted/30"
                                placeholder="e.g. yourname@ybl"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.3em] ml-4 block">
                            Bio
                          </label>
                          <textarea 
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="w-full bg-noir-bg border border-noir-border rounded-none p-6 text-noir-ink text-lg placeholder:text-noir-muted/20 focus:outline-none focus:ring-1 focus:ring-noir-accent focus:border-noir-accent transition-all shadow-sm min-h-[150px] resize-none"
                            placeholder="Tell us about yourself..."
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                          <Button 
                            type="submit" 
                            className="flex-grow btn-noir !rounded-none uppercase font-display tracking-widest !py-4"
                            isLoading={isUploading}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost"
                            onClick={() => {
                              resetEditingState();
                              setIsEditing(false);
                            }}
                            className="sm:w-32 !rounded-none uppercase font-display tracking-widest text-noir-muted hover:bg-noir-accent/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardBody>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="profile-details"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <Card className="bg-noir-card border-noir-border rounded-none">
                    <CardHeader>
                      <h3 className="text-xl font-display font-semibold text-noir-ink uppercase tracking-wide">
                        Account Overview
                      </h3>
                    </CardHeader>
                    <CardBody className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                          <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Member Since</p>
                          <p className="text-lg font-semibold text-noir-ink uppercase tracking-wide">
                            {new Date(user.createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                          <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Account Type</p>
                          <p className="text-lg font-semibold text-noir-accent uppercase tracking-wide">
                            {user.role}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-base font-semibold text-noir-ink flex items-center gap-2 uppercase tracking-wide">
                          <Edit3 className="w-5 h-5 text-noir-accent" />
                          Personal Bio
                        </h4>
                        <div className="p-8 bg-noir-bg border border-noir-border rounded-none shadow-sm italic text-noir-muted leading-relaxed">
                          {user.bio || "You haven't added a bio yet. Click 'Edit Profile' to tell the community about yourself!"}
                        </div>
                      </div>

                      {user.role === 'organizer' && (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h4 className="text-base font-semibold text-noir-ink flex items-center gap-2 uppercase tracking-wide">
                              <Shield className="w-5 h-5 text-noir-accent" />
                              Verification & SLA
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className={`p-6 border rounded-none ${verificationTone}`}>
                                <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em]">Verification Status</p>
                                <p className="mt-3 text-lg font-semibold uppercase tracking-wide">{formatVerificationStatus(verificationStatus)}</p>
                                {user.verificationNotes && (
                                  <p className="mt-3 text-xs uppercase tracking-wide text-current/80">{user.verificationNotes}</p>
                                )}
                              </div>
                              <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                                <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Response SLA</p>
                                <p className="text-lg font-semibold text-noir-ink uppercase tracking-wide">
                                  {formatResponseTime(user.responseTimeHours)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-base font-semibold text-noir-ink flex items-center gap-2 uppercase tracking-wide">
                              <Shield className="w-5 h-5 text-noir-accent" />
                              Business Profile & Payouts
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                                <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Business Name</p>
                                <p className="text-lg font-semibold text-noir-ink uppercase tracking-wide">
                                  {user.businessName || 'Not added yet'}
                                </p>
                              </div>
                              <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                                <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Business Type</p>
                                <p className="text-lg font-semibold text-noir-ink uppercase tracking-wide">
                                  {user.businessType || 'Not added yet'}
                                </p>
                              </div>
                              <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                                <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Operating Location</p>
                                <p className="text-lg font-semibold text-noir-ink uppercase tracking-wide">
                                  {user.businessLocation || 'Not added yet'}
                                </p>
                              </div>
                              <div className="p-6 bg-noir-bg rounded-none border border-noir-border">
                                <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">Active UPI ID</p>
                                <p className="text-lg font-mono font-semibold text-noir-ink break-all">
                                  {user.upiId || 'Not added yet'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Quick Stats or Activity could go here */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {profileStats.map((stat, i) => (
                      <Card key={i} className="text-center p-8 bg-noir-card border-noir-border rounded-none">
                        <p className="text-[10px] font-mono font-semibold text-noir-accent uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                        <p className="text-xl font-display font-semibold text-noir-ink uppercase tracking-wide">{stat.value}</p>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-noir-accent text-noir-bg px-8 py-4 rounded-none shadow-2xl flex items-center gap-3 font-semibold uppercase font-mono text-xs border border-noir-bg"
          >
            <Check className="w-6 h-6" />
            {successMessage}
            <button onClick={() => setSuccessMessage(null)} className="ml-4 hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] bg-red-500 text-white px-8 py-4 rounded-none shadow-2xl flex items-center gap-3 font-semibold uppercase font-mono text-xs border border-noir-bg"
          >
            <AlertCircle className="w-6 h-6" />
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} className="ml-4 hover:opacity-70">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
