import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;
    
    const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
    onChange(newValue);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
      textarea.focus();
    }, 0);
  };

  // Handle paste events
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    
    // Check for image files first
    const items = Array.from(clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        await handleImageUpload(file);
        return;
      }
    }
    
    // Check for URLs
    const text = clipboardData.getData('text/plain');
    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
      // Auto-detect URL types and format appropriately
      if (text.includes('youtube.com/watch') || text.includes('youtu.be/') || text.includes('youtube.com/embed')) {
        e.preventDefault();
        const videoId = getYouTubeVideoId(text);
        if (videoId) {
          // Use special embed format for auto-pasted YouTube URLs
          const embedMarkdown = `\n\n{{YOUTUBE:${videoId}}}\n\n`;
          insertAtCursor(embedMarkdown);
          toast({ title: "YouTube video auto-detected and embedded!" });
        }
        return;
      }
      
      if (text.includes('twitter.com') || text.includes('x.com')) {
        e.preventDefault();
        const linkMarkdown = `[🐦 Twitter/X Post](${text})`;
        insertAtCursor(linkMarkdown);
        toast({ title: "Twitter/X link auto-detected and added!" });
        return;
      }
      
      if (text.includes('instagram.com')) {
        e.preventDefault();
        const linkMarkdown = `[📷 Instagram Post](${text})`;
        insertAtCursor(linkMarkdown);
        toast({ title: "Instagram link auto-detected and added!" });
        return;
      }
      
      if (text.includes('tiktok.com')) {
        e.preventDefault();
        const linkMarkdown = `[🎵 TikTok Video](${text})`;
        insertAtCursor(linkMarkdown);
        toast({ title: "TikTok link auto-detected and added!" });
        return;
      }
      
      if (text.includes('linkedin.com')) {
        e.preventDefault();
        const linkMarkdown = `[💼 LinkedIn Post](${text})`;
        insertAtCursor(linkMarkdown);
        toast({ title: "LinkedIn link auto-detected and added!" });
        return;
      }
      
      // Regular URL
      e.preventDefault();
      const linkMarkdown = `[${text}](${text})`;
      insertAtCursor(linkMarkdown);
      toast({ title: "URL link auto-detected and added!" });
    }
  }, [toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await handleImageUpload(imageFile);
    } else {
      toast({ title: "Please drop an image file", variant: "destructive" });
    }
  }, [toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertFormatting('bold');
    }
    
    // Ctrl/Cmd + I for italic  
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertFormatting('italic');
    }
    
    // Ctrl/Cmd + K for link (opens dialog)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsDialogOpen(true);
    }
  }, []);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const imageMarkdown = `![${file.name}](${result.url})`;
      insertAtCursor(imageMarkdown);
      
      toast({ title: "Image uploaded successfully!" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Insert link
  const insertLink = () => {
    if (!linkUrl) return;
    const linkMarkdown = `[${linkText || linkUrl}](${linkUrl})`;
    insertAtCursor(linkMarkdown);
    setLinkUrl("");
    setLinkText("");
    setIsDialogOpen(false);
  };

  // Extract YouTube video ID with better regex
  const getYouTubeVideoId = (url: string) => {
    // Support multiple YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Insert YouTube embed
  const insertYouTube = () => {
    if (!youtubeUrl) return;
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (videoId) {
      // Use a special format that the renderer will recognize as an embed
      const embedMarkdown = `\n\n{{YOUTUBE:${videoId}}}\n\n`;
      insertAtCursor(embedMarkdown);
      setYoutubeUrl("");
      setIsDialogOpen(false);
      toast({ title: "YouTube video embedded!" });
    } else {
      toast({ title: "Invalid YouTube URL", variant: "destructive" });
    }
  };

  // Insert social media links
  const insertSocialLink = (platform: string) => {
    let url = "";
    let text = "";
    
    switch (platform) {
      case "twitter":
        url = prompt("Enter Twitter/X URL:") || "";
        text = "🐦 Twitter/X Post";
        break;
      case "instagram":
        url = prompt("Enter Instagram URL:") || "";
        text = "📷 Instagram Post";
        break;
      case "tiktok":
        url = prompt("Enter TikTok URL:") || "";
        text = "🎵 TikTok Video";
        break;
      case "linkedin":
        url = prompt("Enter LinkedIn URL:") || "";
        text = "💼 LinkedIn Post";
        break;
    }
    
    if (url) {
      const linkMarkdown = `[${text}](${url})`;
      insertAtCursor(linkMarkdown);
      setIsDialogOpen(false);
      toast({ title: `${platform} link added!` });
    }
  };

  // Insert formatting
  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = "";
    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        formattedText = `*${selectedText || "italic text"}*`;
        break;
      case "heading":
        formattedText = `### ${selectedText || "Heading"}`;
        break;
      case "quote":
        formattedText = `> ${selectedText || "Quote"}`;
        break;
      case "code":
        formattedText = `\`${selectedText || "code"}\``;
        break;
      case "list":
        formattedText = `- ${selectedText || "List item"}`;
        break;
    }
    
    insertAtCursor(formattedText);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("bold")}
            title="Bold"
            data-testid="button-format-bold"
          >
            <i className="fas fa-bold"></i>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("italic")}
            title="Italic"
            data-testid="button-format-italic"
          >
            <i className="fas fa-italic"></i>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("heading")}
            title="Heading"
            data-testid="button-format-heading"
          >
            <i className="fas fa-heading"></i>
          </Button>
        </div>

        {/* Lists and Quotes */}
        <div className="flex gap-1 border-r pr-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("list")}
            title="List"
            data-testid="button-format-list"
          >
            <i className="fas fa-list-ul"></i>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("quote")}
            title="Quote"
            data-testid="button-format-quote"
          >
            <i className="fas fa-quote-left"></i>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => insertFormatting("code")}
            title="Code"
            data-testid="button-format-code"
          >
            <i className="fas fa-code"></i>
          </Button>
        </div>

        {/* Media */}
        <div className="flex gap-1">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Add Media"
                data-testid="button-add-media"
              >
                <i className="fas fa-plus mr-1"></i>
                Media
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Media Content</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="image">Image</TabsTrigger>
                  <TabsTrigger value="link">Link</TabsTrigger>
                  <TabsTrigger value="youtube">YouTube</TabsTrigger>
                  <TabsTrigger value="social">Social</TabsTrigger>
                </TabsList>
                
                <TabsContent value="image" className="space-y-4">
                  <div>
                    <Label>Upload Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-upload-image"
                    >
                      {isUploading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-image mr-2"></i>
                          Choose Image
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="space-y-4">
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      data-testid="input-link-url"
                    />
                  </div>
                  <div>
                    <Label>Link Text (optional)</Label>
                    <Input
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="Link description"
                      data-testid="input-link-text"
                    />
                  </div>
                  <Button onClick={insertLink} className="w-full" data-testid="button-insert-link">
                    <i className="fas fa-link mr-2"></i>
                    Insert Link
                  </Button>
                </TabsContent>
                
                <TabsContent value="youtube" className="space-y-4">
                  <div>
                    <Label>YouTube URL</Label>
                    <Input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      data-testid="input-youtube-url"
                    />
                  </div>
                  <Button onClick={insertYouTube} className="w-full" data-testid="button-insert-youtube">
                    <i className="fab fa-youtube mr-2"></i>
                    Insert YouTube Video
                  </Button>
                </TabsContent>
                
                <TabsContent value="social" className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => insertSocialLink("twitter")}
                      variant="outline"
                      className="w-full"
                      data-testid="button-insert-twitter"
                    >
                      <i className="fab fa-twitter mr-2"></i>
                      Twitter/X
                    </Button>
                    <Button
                      onClick={() => insertSocialLink("instagram")}
                      variant="outline"
                      className="w-full"
                      data-testid="button-insert-instagram"
                    >
                      <i className="fab fa-instagram mr-2"></i>
                      Instagram
                    </Button>
                    <Button
                      onClick={() => insertSocialLink("tiktok")}
                      variant="outline"
                      className="w-full"
                      data-testid="button-insert-tiktok"
                    >
                      <i className="fab fa-tiktok mr-2"></i>
                      TikTok
                    </Button>
                    <Button
                      onClick={() => insertSocialLink("linkedin")}
                      variant="outline"
                      className="w-full"
                      data-testid="button-insert-linkedin"
                    >
                      <i className="fab fa-linkedin mr-2"></i>
                      LinkedIn
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Text Area */}
      <div 
        className={`relative ${isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Write your content here... Use the toolbar above to add images, links, and multimedia content. You can also:\n• Paste images directly from clipboard\n• Paste URLs (auto-detects YouTube, Twitter, Instagram, etc.)\n• Drag & drop images\n• Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for links"}
          className={`min-h-[200px] ${className} ${isDragOver ? 'border-blue-500' : ''}`}
          data-testid="rich-text-editor-textarea"
        />
        
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center rounded-md border-2 border-dashed border-blue-500">
            <div className="text-center">
              <i className="fas fa-upload text-3xl text-blue-500 mb-2"></i>
              <p className="text-blue-700 font-medium">Drop your image here</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>💡 <strong>Pro Tips:</strong></div>
        <div>• <strong>Copy/Paste:</strong> Paste images directly from clipboard or drag & drop them</div>
        <div>• <strong>URLs:</strong> Paste any URL and it will be auto-formatted (YouTube, Twitter, Instagram, etc.)</div>
        <div>• <strong>Keyboard:</strong> Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link dialog)</div>
        <div>• <strong>Formatting:</strong> Use toolbar for headings, quotes, lists, and code</div>
      </div>
    </div>
  );
}