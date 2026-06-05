/**
 * Simple Language Translation Seed
 * Translates technical IT words into simple business words.
 * Kedloom style: Simplified, professional, and accessible.
 */

require('dotenv').config();
const { Translation } = require('../models');

const hindiTranslations = {
  // Navigation & General
  'nav_home': 'मुख्य पृष्ठ',
  'nav_tp_maps': 'नक्शे (Maps)',
  'nav_pdf': 'दस्तावेज़ (Docs)',
  'nav_projects': 'प्रोजेक्ट्स',
  'nav_updates': 'नई जानकारी',
  'nav_contact': 'संपर्क करें',
  'nav_about': 'हमारे बारे में',
  'nav_portals': 'पोर्टल्स',
  'nav_airport': 'एयरपोर्ट',
  'nav_infrastructure': 'सुविधाएं',
  
  // Lead Popup (Simplified)
  'start_here': 'शुरुआत करें',
  'verify_desc': 'पूरी जानकारी देखने के लिए अपनी पहचान बताएं',
  'full_name': 'आपका पूरा नाम',
  'mobile_number': 'मोबाइल नंबर',
  'get_access': 'आगे बढ़ें',
  'access_granted': 'पहुंच मिल गई है',
  'terms_agree': 'मैं सहमत हूँ',
  'terms': 'नियमों',
  'and': 'और',
  'privacy': 'गोपनीयता नीति से',
  
  // Errors (Simplified)
  'err_name': 'कृपया अपना नाम लिखें',
  'err_phone': 'कृपया सही मोबाइल नंबर लिखें',
  'err_terms': 'कृपया नियमों से सहमत हों',
  'err_generic': 'कुछ गलत हुआ, फिर कोशिश करें',
  
  // Business Context
  'verified_data': 'सत्यापित डेटा',
  'expert_support': 'विशेषज्ञ सहायता',
  'strategic_roi': 'बेहतर मुनाफा',
  'trust_record': 'भरोसेमंद रिकॉर्ड',
  'talk_to_owner': 'सीधे मालिक से बात करें',
  'book_site_visit': 'साइट देखने का समय चुनें'
};

const englishTranslations = {
  'nav_home': 'Home',
  'nav_tp_maps': 'Maps',
  'nav_pdf': 'Documents',
  'nav_projects': 'Projects',
  'nav_updates': 'Latest Updates',
  'nav_contact': 'Contact Us',
  'nav_about': 'About Us',
  'nav_portals': 'Portals',
  'start_here': 'Get Started',
  'verify_desc': 'Please identify yourself to view details',
  'full_name': 'Full Name',
  'mobile_number': 'Mobile Number',
  'get_access': 'Continue',
  'access_granted': 'Access Granted',
  'talk_to_owner': 'Talk to Owner'
};

async function seed() {
  console.log('🚀 Seeding Simplified Translations...');
  
  try {
    // Seed Hindi
    for (const [key, value] of Object.entries(hindiTranslations)) {
      await Translation.upsert({ key, lang: 'hi', value });
    }
    
    // Seed English
    for (const [key, value] of Object.entries(englishTranslations)) {
      await Translation.upsert({ key, lang: 'en', value });
    }

    console.log('✅ Translations Seeded Successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
}

seed();
