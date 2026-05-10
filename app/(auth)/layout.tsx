import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-boopick-cream flex items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center mb-6">
          <Image
            src="/img/icon-192.png"
            alt="부픽"
            width={56}
            height={56}
            className="rounded-2xl shadow-md mx-auto"
          />
          <p className="mt-3 font-bold text-boopick-navy">부픽</p>
        </Link>
        {children}
      </div>
    </div>
  );
}
