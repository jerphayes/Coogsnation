import { MailService } from '@sendgrid/mail';
import { User, AchievementLevel, achievementLevels } from '@shared/schema';

// Initialize SendGrid service
const mailService = new MailService();

// Check for API key and set it if available
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY environment variable not set. Email notifications will not work.');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

// Generic email sending function with enhanced error handling
export async function sendEmail(params: EmailParams, retryCount: number = 0): Promise<boolean> {
  const maxRetries = 3;
  const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('[EMAIL] Configuration error: SENDGRID_API_KEY not configured');
    return false;
  }

  // Validate email parameters
  if (!params.to || !params.from || !params.subject) {
    console.error('[EMAIL] Validation error: Missing required email parameters', {
      to: !!params.to,
      from: !!params.from,
      subject: !!params.subject
    });
    return false;
  }

  try {
    const mailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };

    // Add either text or html content
    if (params.text) {
      mailData.text = params.text;
    }
    if (params.html) {
      mailData.html = params.html;
    }
    
    // Ensure at least text is provided if neither is available
    if (!params.text && !params.html) {
      mailData.text = params.subject; // Fallback to subject as text
    }

    console.log(`[EMAIL] Sending email attempt ${retryCount + 1}/${maxRetries + 1} to ${params.to}, subject: "${params.subject}"`);
    
    await mailService.send(mailData);
    console.log(`[EMAIL] ✅ Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    const isRetryableError = error.code >= 500 || error.code === 429; // Server errors or rate limits
    
    console.error(`[EMAIL] ❌ SendGrid error (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
      to: params.to,
      subject: params.subject,
      error: error.message || error,
      code: error.code,
      response: error.response?.body,
      isRetryable: isRetryableError
    });

    // Retry logic for transient failures
    if (isRetryableError && retryCount < maxRetries) {
      console.log(`[EMAIL] Retrying email send in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return sendEmail(params, retryCount + 1);
    }
    
    console.error(`[EMAIL] 💥 Email sending failed permanently after ${retryCount + 1} attempts`);
    return false;
  }
}

// Achievement notification email template with University of Houston theme
function generateAchievementEmailHTML(user: User, newLevel: AchievementLevel): string {
  const achievement = achievementLevels.find(level => level.level === newLevel);
  const currentLevelIndex = achievementLevels.findIndex(level => level.level === newLevel);
  const nextLevel = currentLevelIndex < achievementLevels.length - 1 ? achievementLevels[currentLevelIndex + 1] : null;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Congratulations on Your Achievement!</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #C8102E, #E31837);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .badge {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .achievement-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        .achievement-description {
          font-size: 16px;
          margin: 5px 0 0;
          opacity: 0.9;
        }
        .content {
          text-align: center;
          margin-bottom: 25px;
        }
        .stats {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .stat-item {
          display: inline-block;
          margin: 0 15px;
          text-align: center;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #C8102E;
        }
        .stat-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
        }
        .next-goal {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #C8102E, #E31837);
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 14px;
        }
        .uh-colors {
          color: #C8102E;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="badge">🏆</div>
          <h1 class="achievement-title">${newLevel}</h1>
          <p class="achievement-description">${achievement?.description || 'Outstanding achievement!'}</p>
        </div>
        
        <div class="content">
          <h2>Congratulations, ${user.firstName || user.username || 'Cougar'}!</h2>
          <p>You've just earned the <strong class="uh-colors">${newLevel}</strong> achievement in our University of Houston community! Your dedication and active participation have not gone unnoticed.</p>
          
          <div class="stats">
            <div class="stat-item">
              <div class="stat-number">${user.postCount || 0}</div>
              <div class="stat-label">Total Posts</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${user.threadCount || 0}</div>
              <div class="stat-label">Threads Started</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${user.reputation || 0}</div>
              <div class="stat-label">Reputation</div>
            </div>
          </div>
          
          ${nextLevel ? `
          <div class="next-goal">
            <h3>🎯 Next Goal: ${nextLevel.level}</h3>
            <p>Keep going! You need <strong>${nextLevel.threshold - (user.postCount || 0)}</strong> more posts to reach <strong>${nextLevel.level}</strong>.</p>
          </div>
          ` : `
          <div class="next-goal">
            <h3>🌟 Maximum Achievement Reached!</h3>
            <p>Congratulations! You've reached the highest achievement level in our community. You are truly a <strong class="uh-colors">Head Coach</strong>!</p>
          </div>
          `}
          
          <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/profile" class="cta-button">
            View Your Profile
          </a>
        </div>
        
        <div class="footer">
          <p><strong class="uh-colors">Go Coogs!</strong> 🐾</p>
          <p>University of Houston Community Platform</p>
          <p>This email was sent because you've been an active member of our community. Your engagement makes our community stronger!</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate plain text version for email clients that don't support HTML
function generateAchievementEmailText(user: User, newLevel: AchievementLevel): string {
  const achievement = achievementLevels.find(level => level.level === newLevel);
  const currentLevelIndex = achievementLevels.findIndex(level => level.level === newLevel);
  const nextLevel = currentLevelIndex < achievementLevels.length - 1 ? achievementLevels[currentLevelIndex + 1] : null;

  return `
🏆 ACHIEVEMENT UNLOCKED! 🏆

Congratulations, ${user.firstName || user.username || 'Cougar'}!

You've just earned the ${newLevel} achievement!
${achievement?.description || 'Outstanding achievement!'}

Your Stats:
- Total Posts: ${user.postCount || 0}
- Threads Started: ${user.threadCount || 0}
- Reputation: ${user.reputation || 0}

${nextLevel 
  ? `Next Goal: ${nextLevel.level}
You need ${nextLevel.threshold - (user.postCount || 0)} more posts to reach ${nextLevel.level}.`
  : `You've reached the maximum achievement level! You are truly a Head Coach!`
}

Keep up the great work in our University of Houston community!

Go Coogs! 🐾

---
University of Houston Community Platform
${process.env.CLIENT_URL || 'http://localhost:5000'}
  `.trim();
}

// Send achievement notification email with enhanced logging
export async function sendAchievementEmail(user: User, newLevel: AchievementLevel): Promise<boolean> {
  console.log(`[ACHIEVEMENT EMAIL] Processing achievement email for user ${user.id}`, {
    userId: user.id,
    email: user.email ? '***@***' : 'none',
    newLevel,
    hasMarketingConsent: user.hasConsentedToMarketing
  });

  if (!user.email) {
    console.error(`[ACHIEVEMENT EMAIL] ❌ Cannot send achievement email: user ${user.id} has no email address`);
    return false;
  }

  // Check if user has consented to marketing emails
  if (!user.hasConsentedToMarketing) {
    console.log(`[ACHIEVEMENT EMAIL] ⏭️ Skipping achievement email for user ${user.id}: no marketing consent`);
    return false;
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@uhcommunity.com';
  const subject = `🏆 Achievement Unlocked: ${newLevel}!`;

  console.log(`[ACHIEVEMENT EMAIL] Sending ${newLevel} achievement email to user ${user.id}`);
  
  const result = await sendEmail({
    to: user.email,
    from: fromEmail,
    subject,
    text: generateAchievementEmailText(user, newLevel),
    html: generateAchievementEmailHTML(user, newLevel)
  });

  if (result) {
    console.log(`[ACHIEVEMENT EMAIL] ✅ Achievement email sent successfully for user ${user.id}, level: ${newLevel}`);
  } else {
    console.error(`[ACHIEVEMENT EMAIL] ❌ Failed to send achievement email for user ${user.id}, level: ${newLevel}`);
  }

  return result;
}

// Send welcome email for new users
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  if (!user.email || !user.hasConsentedToMarketing) {
    return false;
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@uhcommunity.com';
  const subject = 'Welcome to the University of Houston Community! 🐾';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to UH Community</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
      <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; background: linear-gradient(135deg, #C8102E, #E31837); color: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h1>Welcome to the UH Community! 🐾</h1>
        </div>
        
        <div style="text-align: center;">
          <h2>Hello, ${user.firstName || user.username || 'Cougar'}!</h2>
          <p>Welcome to the University of Houston community platform! We're excited to have you join our vibrant community of students, alumni, faculty, and fans.</p>
          
          <p>You start your journey as a <strong style="color: #C8102E;">Rookie</strong>. Share your thoughts, start discussions, and engage with fellow Cougars to earn achievement levels!</p>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3>🎯 Your First Goals:</h3>
            <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
              <li>Complete your profile</li>
              <li>Make your first post</li>
              <li>Join a discussion</li>
              <li>Reach 200 posts for Bronze Star!</li>
            </ul>
          </div>
          
          <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}" style="display: inline-block; background: linear-gradient(135deg, #C8102E, #E31837); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
            Explore Community
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p><strong style="color: #C8102E;">Go Coogs!</strong> 🐾</p>
          <p>University of Houston Community Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to the University of Houston Community! 🐾

Hello, ${user.firstName || user.username || 'Cougar'}!

Welcome to the University of Houston community platform! We're excited to have you join our vibrant community of students, alumni, faculty, and fans.

You start your journey as a Rookie. Share your thoughts, start discussions, and engage with fellow Cougars to earn achievement levels!

Your First Goals:
- Complete your profile
- Make your first post
- Join a discussion
- Reach 200 posts for Bronze Star!

Visit: ${process.env.CLIENT_URL || 'http://localhost:5000'}

Go Coogs! 🐾
University of Houston Community Platform
  `.trim();

  return await sendEmail({
    to: user.email,
    from: fromEmail,
    subject,
    text,
    html
  });
}