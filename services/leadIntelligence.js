/**
 * LeadIntelligenceService
 * Automates lead scoring and interest profiling based on behavioral data.
 */

class LeadIntelligenceService {
  /**
   * Calculates a score for a lead based on their engagement.
   * @param {Object} lead - The lead model instance.
   * @returns {Object} - { score, profile }
   */
  static calculateIntelligence(lead) {
    let score = 0;
    const profile = {
      category: 'Cold',
      topInterests: [],
      intentLevel: 'Low',
      lastAnalyzed: new Date().toISOString()
    };

    // 1. Engagement Scoring
    score += Math.min((lead.visit_count || 0) * 5, 50);
    score += Math.min(Math.floor((lead.timeSpent || 0) / 30), 100);
    
    if (lead.verified) score += 20;
    if (lead.returning_visitor) score += 15;
    if (lead.is_pro) score += 50;

    // 2. Page Intent Analysis
    let visitedPages = [];
    try {
      visitedPages = JSON.parse(lead.visited_pages || '[]');
    } catch (e) {
      visitedPages = [];
    }

    const highIntentKeywords = ['map', 'tp', 'dashboard', 'pricing', 'contact', 'admin', 'professional', 'download'];
    const mediumIntentKeywords = ['update', 'blog', 'project', 'infrastructure'];

    const interestMap = {};

    visitedPages.forEach(page => {
      const lowerPage = page.toLowerCase();
      
      // Keywords check
      highIntentKeywords.forEach(kw => {
        if (lowerPage.includes(kw)) {
          score += 10;
          interestMap[kw] = (interestMap[kw] || 0) + 1;
        }
      });

      mediumIntentKeywords.forEach(kw => {
        if (lowerPage.includes(kw)) {
          score += 5;
          interestMap[kw] = (interestMap[kw] || 0) + 1;
        }
      });
    });

    // 3. Profile Categorization
    if (score > 150) {
      profile.category = 'Hot';
      profile.intentLevel = 'High';
    } else if (score > 50) {
      profile.category = 'Warm';
      profile.intentLevel = 'Medium';
    }

    // Identify Top Interests
    profile.topInterests = Object.entries(interestMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    return {
      score: Math.min(score, 1000), // Cap at 1000 for sanity
      profile: JSON.stringify(profile)
    };
  }

  /**
   * Updates lead intelligence in the database and triggers alerts if necessary.
   */
  static async updateLeadIntelligence(lead) {
    const { score, profile } = this.calculateIntelligence(lead);
    
    const oldScore = lead.score || 0;
    lead.score = score;
    lead.interest_profile = profile;
    
    await lead.save();

    // Trigger AI Real-time Alert if lead becomes "Hot"
    const parsedProfile = JSON.parse(profile);
    if (score > 150 && oldScore <= 150) {
      const { maybeNotifyHighInterestLead } = require('./leadNotifications');
      // Pass the updated lead and a dummy context that forces notification
      await maybeNotifyHighInterestLead(lead, { 
        isAiHotTrigger: true,
        category: parsedProfile.category,
        topInterests: parsedProfile.topInterests
      });
    }

    return lead;
  }
}

module.exports = LeadIntelligenceService;
