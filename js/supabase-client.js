(function (window) {
  'use strict';

  const projectUrl = 'https://nwnppwwvbtsiahsnlvgh.supabase.co';
  const publishableKey = 'sb_publishable_9TaB56eLdfFe5t6pSZ2pXA_ns3r9rdp';

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase JS v2 CDN을 불러오지 못했습니다.');
    return;
  }

  // `supabase`는 CDN UMD 전역 이름이므로, 생성한 클라이언트는 별도 이름으로 보관합니다.
  window.handoverSupabaseClient = window.supabase.createClient(projectUrl, publishableKey);
})(window);
