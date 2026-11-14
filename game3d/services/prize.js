// Prize email flow (original claimPrizeAction / showRewards, cleaningup.html 2282-2348).
// The email goes to the PUBLIC MailerLite embedded-form endpoint (the same form index.html uses) as form data.
// No API token is needed or allowed in client-side code: do not add one.
export const MAILERLITE_FORM_URL = 'https://assets.mailerlite.com/jsonp/2119029/forms/179598963155928272/subscribe';

export const validEmail = (email) => !!email && email.includes('@') && email.includes('.');

// Tiers by score, as in the original: 100 / 1000 / 5000 downloads, 20000 = free t-shirt message.
export const prizeTier = (score) => (score >= 20000 ? 20000 : score >= 5000 ? 5000 : score >= 1000 ? 1000 : score >= 100 ? 100 : 0);
export const PRIZE_LINKS = [
  { min: 100, label: 'DOWNLOAD: Black Sheep Boy Cover', href: 'https://www.dropbox.com/scl/fi/zkw06b4yygtbapx82ybfu/Black-Sheep-Boy-Cover.wav?rlkey=xtylq5vcmywtcakyy5h5kdn05&st=90zrkq5r&dl=0' },
  { min: 1000, label: 'DOWNLOAD: Shelter Live Acoustic', href: 'https://www.dropbox.com/scl/fi/bbbwfeg0ebsngc5xosc6k/Shelter-Acoustic.wav?rlkey=hr3okth9enxj75r57e0dr7fv4&st=gok2g7w6&dl=0' },
  { min: 5000, label: 'DOWNLOAD: Leaning on the Exit (Rochee Remix)', href: 'https://www.dropbox.com/scl/fi/2lzidx484ng98q2rce0ul/Cowboy-Clean-Leaning-On-The-Exit_exp0411.wav?rlkey=mivwq2o68305wqo755qm475hi&st=jncdylr4&dl=0' },
];
export const TSHIRT_SCORE = 20000;

// Posts the sign-up. Like the original it reports success even when the request errors (no-cors gives an opaque response).
export async function claimPrize(email) {
  try {
    const formData = new FormData();
    formData.append('fields[email]', email);
    formData.append('ml-submit', '1');
    formData.append('anticsrf', 'true');
    await fetch(MAILERLITE_FORM_URL, { method: 'POST', mode: 'no-cors', body: formData });
  } catch { /* original: showRewards() either way */ }
  return true;
}
