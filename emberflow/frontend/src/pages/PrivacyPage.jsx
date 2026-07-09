export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <p className="eyebrow">Privacy</p>
      <h1>Privacy Policy</h1>
      <p>EmberFlow stores account, client, invoice, proposal, payment, and subscription data needed to operate the product.</p>
      <p>Authentication and database storage are powered by Supabase. Subscription checkout and customer billing are handled by Paddle.</p>
      <p>We do not sell user data. Production operators should configure Supabase, Vercel, and Paddle according to their privacy obligations.</p>
    </main>
  );
}
