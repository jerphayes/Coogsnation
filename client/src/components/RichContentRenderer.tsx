interface RichContentRendererProps {
  content: string;
  className?: string;
}

export function RichContentRenderer({ content, className }: RichContentRendererProps) {
  // All patterns defined at the top level
  const patterns = {
    // YouTube embeds: {{YOUTUBE:videoId}}
    youtube: /\{\{YOUTUBE:([a-zA-Z0-9_-]{11})\}\}/g,
    // Images: ![alt](url)
    image: /!\[(.*?)\]\((.*?)\)/g,
    // Social media links with emojis
    socialLinks: /\[(🐦|📷|🎵|💼)\s*(.*?)\]\((.*?)\)/g,
    // Regular links: [text](url)
    links: /\[([^\]]*)\]\(([^)]+)\)/g,
    // Bold: **text**
    bold: /\*\*(.*?)\*\*/g,
    // Italic: *text*
    italic: /\*(.*?)\*/g,
    // Code: `text`
    code: /`([^`]+)`/g,
    // Headings: ### text
    heading: /^### (.+)$/gm,
    // Quotes: > text
    quote: /^> (.+)$/gm,
    // Lists: - text
    list: /^- (.+)$/gm,
  };

  // Helper function to format basic text patterns
  const formatBasicText = (text: string): string => {
    let processedContent = text;

    // Process social media links
    processedContent = processedContent.replace(patterns.socialLinks, (match, emoji, text, url) => {
      const platform = emoji === '🐦' ? 'Twitter/X' :
                     emoji === '📷' ? 'Instagram' :
                     emoji === '🎵' ? 'TikTok' :
                     emoji === '💼' ? 'LinkedIn' : 'Social Media';
      
      return `<div class="social-link my-3 p-3 border rounded-lg bg-gray-50">
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="flex items-center text-blue-600 hover:text-blue-800">
          <span class="text-lg mr-2">${emoji}</span>
          <div>
            <div class="font-medium">${text || platform}</div>
            <div class="text-sm text-gray-500">${url}</div>
          </div>
        </a>
      </div>`;
    });

    // Process regular links
    processedContent = processedContent.replace(patterns.links, (match, text, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${text}</a>`;
    });

    // Process text formatting
    processedContent = processedContent.replace(patterns.bold, '<strong>$1</strong>');
    processedContent = processedContent.replace(patterns.italic, '<em>$1</em>');
    processedContent = processedContent.replace(patterns.code, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Process headings
    processedContent = processedContent.replace(patterns.heading, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
    
    // Process quotes
    processedContent = processedContent.replace(patterns.quote, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-2">$1</blockquote>');
    
    // Process lists
    processedContent = processedContent.replace(patterns.list, '<li class="ml-4">• $1</li>');

    // Convert line breaks to <br> tags
    processedContent = processedContent.replace(/\n/g, '<br>');

    return processedContent;
  };

  // Main render function
  const renderContent = (text: string) => {
    if (!text) return null;

    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    // First, handle YouTube embeds
    const youtubeMatches = Array.from(text.matchAll(patterns.youtube));
    
    if (youtubeMatches.length > 0) {
      youtubeMatches.forEach((match, index) => {
        const [fullMatch, videoId] = match;
        const beforeMatch = text.substring(lastIndex, match.index);
        
        // Add text content before YouTube embed
        if (beforeMatch.trim()) {
          elements.push(
            <div key={`text-before-${index}`} className="mb-4">
              <div dangerouslySetInnerHTML={{ __html: formatBasicText(beforeMatch) }} />
            </div>
          );
        }
        
        // Add YouTube embed
        elements.push(
          <div key={`youtube-${index}`} className="my-6">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
              />
            </div>
            <div className="text-sm text-gray-500 mt-2 flex items-center">
              <i className="fab fa-youtube text-red-600 mr-2"></i>
              <a 
                href={`https://www.youtube.com/watch?v=${videoId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        );
        
        lastIndex = (match.index || 0) + fullMatch.length;
      });
      
      // Add remaining content after last YouTube embed
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        elements.push(
          <div key="text-final">
            <div dangerouslySetInnerHTML={{ __html: formatBasicText(remainingText) }} />
          </div>
        );
      }
      
      return <div className={className}>{elements}</div>;
    }

    // Handle images if no YouTube embeds
    const imageMatches = Array.from(text.matchAll(patterns.image));
    if (imageMatches.length > 0) {
      lastIndex = 0;
      
      imageMatches.forEach((match, index) => {
        const [fullMatch, alt, src] = match;
        const beforeMatch = text.substring(lastIndex, match.index);
        
        // Add text content before image
        if (beforeMatch.trim()) {
          elements.push(
            <div key={`text-${index}-before`}>
              <div dangerouslySetInnerHTML={{ __html: formatBasicText(beforeMatch) }} />
            </div>
          );
        }
        
        // Add image
        elements.push(
          <div key={`image-${index}`} className="my-4">
            <img 
              src={src} 
              alt={alt} 
              className="max-w-full h-auto rounded-lg border shadow-sm"
              loading="lazy"
            />
            {alt && <div className="text-sm text-gray-500 mt-1">{alt}</div>}
          </div>
        );
        
        lastIndex = (match.index || 0) + fullMatch.length;
      });

      // Add remaining content after last image
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        elements.push(
          <div key="text-final">
            <div dangerouslySetInnerHTML={{ __html: formatBasicText(remainingText) }} />
          </div>
        );
      }
      
      return <div className={className}>{elements}</div>;
    }

    // If no special content, format normally
    return (
      <div 
        className={`prose prose-sm max-w-none ${className}`}
        dangerouslySetInnerHTML={{ __html: formatBasicText(text) }}
      />
    );
  };

  return renderContent(content || "");
}

export default RichContentRenderer;