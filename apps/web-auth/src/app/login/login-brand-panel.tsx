'use client';

export function LoginBrandPanel() {
  return (
    <section
      className="relative hidden h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-[28px] px-10 py-10 lg:flex xl:px-12"
      style={{ background: 'var(--background)' }}
      aria-label="About SMART"
    >
      {/* Replace with a local file in public/ if you prefer to self-host the photo. */}
      <img
        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
        alt="SMART candidate"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />

      <h1 className="font-heading relative z-10 text-[4.25rem]  font-extrabold uppercase leading-[0.92] tracking-tight xl:text-[5.25rem]">
        Get
        <br />
        Ready
        <br />
        Get Hired
      </h1>
    </section>
  );
}
