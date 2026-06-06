const { Update } = require('../models');
const { translateBlogPost } = require('../services/translationService');

const blogData = [
  {
    "title": "Dholera Smart City Plot Registration Process 2026: Complete Guide for Buyers and Sellers",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/06/photo_2026-06-04_15-24-40.jpg",
    "category": "Investment",
    "content": "Dholera Smart City is attracting investors due to its rapid infrastructure development and future growth potential. Dholera Smart City Plot Registration Process is one of the most important topics for investors planning to buy or sell property in Dholera Smart City. Dholera Smart City has emerged as one of the most promising real estate and investment destinations in Gujarat.\n\n### What is Plot Registration?\nPlot registration is the legal process through which ownership rights are transferred from the seller to the buyer. After registration, the buyer becomes the legal owner of the property.\n\n### Step-by-Step Plot Registration Process\n1. Select the Right Plot\n2. Verify Property Documents\n3. Conduct a Physical Site Visit\n4. Confirm Pricing and Payment Terms\n5. Prepare Required Documentation\n6. Complete Registration Formalities"
  },
  {
    "title": "Dholera Plot Price 2026: Latest Rates, Best Locations & Investment Guide",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/06/fghj.jpeg",
    "category": "Investment",
    "content": "Dholera Plot Price 2026 is one of the most searched real estate topics among investors looking for opportunities in Gujarat. Dholera Smart City is India’s first Greenfield Smart City, designed from scratch with advanced planning and modern infrastructure.\n\nKey highlights include:\n* Dholera International Airport\n* Ahmedabad-Dholera Expressway\n* Smart Road Network\n* Industrial Manufacturing Zones"
  },
  {
    "title": "Plots for Sale in Dholera Smart City Near Airport (2026) – Price, Location & Booking Guide",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-12.30.42-PM.jpeg",
    "category": "Investment",
    "content": "If you are looking for plots for sale in Dholera Smart City, especially near the upcoming international airport, this is the right time to invest. Dholera is rapidly developing into India’s first smart industrial city, and early investors are already seeing strong growth potential."
  },
  {
    "title": "Dholera Smart City Completion Date: Full Timeline, Phases & Future Development (2026 Guide)",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/999.jpeg",
    "category": "Infrastructure",
    "content": "What is the Dholera Smart City completion date? The complete development of Dholera Smart City is expected by 2040. However, important milestones include Phase 1 (2024-2026) and Phase 2 (2026-2032)."
  },
  {
    "title": "Is Dholera Smart City Government Approved? 7 Facts Every Investor Must Know (2026)",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/vvv.png",
    "category": "Infrastructure",
    "content": "Yes, Dholera Smart City is a government-backed and government-approved project. It is being developed under the Delhi-Mumbai Industrial Corridor (DMIC) with involvement from both Central and State governments."
  },
  {
    "title": "Land or Plot Dholera Smart City: 5 Smart Differences You Must Know",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/Screenshot-2026-04-21-124002.webp",
    "category": "Investment",
    "content": "Land means larger raw land for long-term holding. Plot means smaller divided land ready for resale. Land is for large budgets and long-term vision; plots are for lower budgets and easier entry."
  },
  {
    "title": "How to Buy Plot in Dholera Smart City Without Risk (2026 Guide)",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/ff.png",
    "category": "Investment",
    "content": "Safely buy plot in Dholera by: Choosing the right location, verifying legal documents (Title/NA), working with trusted experts, and thinking long-term."
  },
  {
    "title": "Dholera Smart City Safe Investment or Scam – Full Truth 2026",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/1000.png",
    "category": "Investment",
    "content": "Dholera is a real government project, not a scam. However, individual deals require verification of location, documents, and dealers to ensure safety."
  },
  {
    "title": "Dholera Investment 2026: Aaj Buy Karo, Kal High Profit Kamao | Best Dholera Property Deals",
    "imageUrl": "https://dholerahub.com/wp-content/uploads/2026/04/dd.jpg",
    "category": "Investment",
    "content": "Dholera Smart City is India's most trending investment hub. With a planned airport, expressway, and industrial growth, early entry offers potential 2x-5x returns by 2030."
  }
];

async function migrate() {
  console.log('🚀 Starting Complete Blog Migration with Original Images...');
  
  for (const blog of blogData) {
    try {
      // 1. Create original English post
      const [update, created] = await Update.findOrCreate({
        where: { title: blog.title },
        defaults: {
          ...blog,
          published: true,
          lang: 'en'
        }
      });

      if (created) {
        console.log(`✅ Created: ${blog.title}`);
        
        // 2. Generate Translations (hi, gu)
        console.log(`🌐 Generating translations for: ${blog.title}...`);
        const translations = await translateBlogPost(blog, ['hi', 'gu']);
        
        for (let i = 0; i < translations.length; i++) {
          const trans = translations[i];
          const langCode = i === 0 ? 'hi' : 'gu';
          
          await Update.create({
            ...trans,
            lang: langCode,
            original_id: update.id,
            published: true
          });
          console.log(`   - Added ${langCode.toUpperCase()} version`);
        }
      } else {
        // Update images for existing ones if they used thumbnails
        await update.update({ imageUrl: blog.imageUrl });
        console.log(`🆙 Updated Image for: ${blog.title}`);
      }
    } catch (err) {
      console.error(`❌ Failed migrating "${blog.title}":`, err.message);
    }
  }

  console.log('🏁 Final Migration Complete!');
  process.exit(0);
}

migrate();
