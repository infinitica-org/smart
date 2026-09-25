import Link from 'next/link';

export const metadata = { title: 'Verify your company · SMART' };

export default function VerifyCompanyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-[2.25rem]">
        Verify your company
      </h1>
      <p className="mt-2 text-base text-[#4b5563]">
        Please have the following information ready for automatic company verification.
      </p>

      <div className="mt-10 space-y-8">
        {/* Business registration number item */}
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[#111827]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Business registration number</h2>
            <p className="mt-0.5 text-sm text-[#6b7280]">
              E.g., BRN, EIN, TIN, or your local equivalent
            </p>
            <p className="mt-3 text-xs leading-relaxed text-[#6b7280]">
              If you don&apos;t have a business registration number, you can{' '}
              <Link
                href="#"
                className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
              >
                continue verification with your government ID only
              </Link>
              . However, this will delay the process.
            </p>
          </div>
        </div>

        {/* Government ID item */}
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-[#111827]">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-3 8a2 2 0 100-4 2 2 0 000 4zm0 0v2m-4-2h8"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827]">Government ID</h2>
            <p className="mt-0.5 text-sm text-[#6b7280]">A photo of your government ID</p>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="flex justify-end pt-12">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#07131e] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.98]"
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
