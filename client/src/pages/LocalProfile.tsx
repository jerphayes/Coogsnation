import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LocalProfile() {
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
    location: "",
    affiliation: "",
    interests: "",
    avatar: ""
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) {
      window.location.href = "/login/other";
      return;
    }
    
    const userData = JSON.parse(currentUser);
    setUser(userData);
    setFormData({
      username: userData.username || "",
      email: userData.email || "",
      bio: userData.bio || "",
      location: userData.location || "",
      affiliation: userData.affiliation || "",
      interests: userData.interests || "",
      avatar: userData.avatar || ""
    });
    setAvatarPreview(userData.avatar || "");
  }, []);

  const generateDefaultAvatar = (name: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Red background
      ctx.fillStyle = "#DC2626";
      ctx.fillRect(0, 0, 256, 256);
      
      // White text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 128px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.charAt(0).toUpperCase(), 128, 128);
    }
    
    return canvas.toDataURL("image/png");
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, 256, 256);
            resolve(canvas.toDataURL("image/png"));
          } else {
            reject(new Error("Canvas context not available"));
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setUploadError("Please upload a JPG or PNG image");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be smaller than 2MB");
      return;
    }

    try {
      const resizedImage = await resizeImage(file);
      setAvatarPreview(resizedImage);
      setFormData({ ...formData, avatar: resizedImage });
    } catch (error) {
      setUploadError("Failed to process image");
    }
  };

  const handleRemoveAvatar = () => {
    const defaultAvatar = generateDefaultAvatar(formData.username || formData.email || "User");
    setAvatarPreview(defaultAvatar);
    setFormData({ ...formData, avatar: defaultAvatar });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    // If no avatar, generate default
    let finalFormData = { ...formData };
    if (!finalFormData.avatar) {
      const defaultAvatar = generateDefaultAvatar(finalFormData.username || finalFormData.email || "User");
      finalFormData.avatar = defaultAvatar;
      setAvatarPreview(defaultAvatar);
    }

    // Update user in currentUser
    const updatedUser = { ...user, ...finalFormData };
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));

    // Update user in coogsnationUsers array
    const allUsers = JSON.parse(localStorage.getItem("coogsnationUsers") || "[]");
    const updatedUsers = allUsers.map((u: any) => 
      (u.email === user.email || u.username === user.username) ? updatedUser : u
    );
    localStorage.setItem("coogsnationUsers", JSON.stringify(updatedUsers));

    setUser(updatedUser);
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  const displayAvatar = avatarPreview || formData.avatar || generateDefaultAvatar(formData.username || formData.email || "U");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <a 
            href="/dashboard" 
            className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold"
            data-testid="link-back-dashboard"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-red-600">
                <AvatarImage src={displayAvatar} alt={formData.username} />
                <AvatarFallback className="bg-red-600 text-white text-2xl font-bold">
                  {(formData.username || formData.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-red-700 mb-2">
                  {formData.username || "CoogsNation Member"}
                </h1>
                <p className="text-gray-600">{formData.email}</p>
                {formData.affiliation && (
                  <p className="text-gray-600 mt-1">
                    <span className="font-semibold">Affiliation:</span> {formData.affiliation}
                  </p>
                )}
              </div>

              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
                className={isEditing ? "border-red-600 text-red-600" : "bg-red-600 hover:bg-red-700"}
                data-testid="button-edit-profile"
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <>
                {/* Avatar Upload */}
                <div>
                  <Label>Profile Avatar</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar className="w-20 h-20 border-2 border-red-600">
                      <AvatarImage src={displayAvatar} alt="Avatar preview" />
                      <AvatarFallback className="bg-red-600 text-white text-xl font-bold">
                        {(formData.username || formData.email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        id="avatar-upload"
                        data-testid="input-avatar-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          data-testid="button-upload-avatar"
                        >
                          Upload Avatar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveAvatar}
                          className="border-gray-300"
                          data-testid="button-remove-avatar"
                        >
                          Use Default
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        JPG or PNG, max 2MB. Auto-resized to 256x256px.
                      </p>
                      {uploadError && (
                        <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1"
                    data-testid="input-username"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <Label htmlFor="affiliation">Affiliation</Label>
                  <Select
                    value={formData.affiliation}
                    onValueChange={(value) => setFormData({ ...formData, affiliation: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-affiliation">
                      <SelectValue placeholder="Select affiliation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Current Student">Current Student</SelectItem>
                      <SelectItem value="Ex-Student">Ex-Student</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="Faculty">Faculty</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Coog Crazy Fan">Coog Crazy Fan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="mt-1"
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Houston, TX"
                    className="mt-1"
                    data-testid="input-location"
                  />
                </div>

                <div>
                  <Label htmlFor="interests">Interests</Label>
                  <Input
                    id="interests"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    placeholder="Sports, Music, Technology, etc."
                    className="mt-1"
                    data-testid="input-interests"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="button-save-profile"
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="border-gray-300"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {formData.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Bio</h3>
                    <p className="text-gray-600">{formData.bio}</p>
                  </div>
                )}
                
                {formData.location && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Location</h3>
                    <p className="text-gray-600">{formData.location}</p>
                  </div>
                )}
                
                {formData.interests && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-1">Interests</h3>
                    <p className="text-gray-600">{formData.interests}</p>
                  </div>
                )}

                {!formData.bio && !formData.location && !formData.interests && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">Your profile is incomplete</p>
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-complete-profile-empty"
                    >
                      Complete Your Profile
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
