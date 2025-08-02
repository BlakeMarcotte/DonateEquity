/**
 * Quick script to sync campaign statistics after manual database changes
 * Run this when you delete donations directly from the database
 */

// You can run this in the browser console on your admin page
async function syncCampaignStats(campaignId) {
  try {
    // Get the current user's auth token
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error('Not authenticated');
      return;
    }

    const token = await user.getIdToken();
    
    const response = await fetch('/api/admin/sync-campaign-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ campaignId })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Campaign stats synced:', result.stats);
      // Refresh the page to see updated stats
      window.location.reload();
    } else {
      console.error('Failed to sync:', result.error);
    }
  } catch (error) {
    console.error('Error syncing campaign stats:', error);
  }
}

// Sync all campaigns (admin only)
async function syncAllCampaignStats() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error('Not authenticated');
      return;
    }

    const token = await user.getIdToken();
    
    const response = await fetch('/api/admin/sync-campaign-stats', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('All campaign stats synced:', result.results);
      // Refresh the page to see updated stats
      window.location.reload();
    } else {
      console.error('Failed to sync:', result.error);
    }
  } catch (error) {
    console.error('Error syncing all campaign stats:', error);
  }
}

console.log('Campaign stats sync functions loaded:');
console.log('- syncCampaignStats(campaignId) - sync specific campaign');
console.log('- syncAllCampaignStats() - sync all campaigns (admin only)');