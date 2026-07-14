import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Navbar from '@/components/Navbar';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#0f172a_34%,#111827_100%)] text-white">
      <Navbar />
      <main className="px-4">
        <Component {...pageProps} />
      </main>
    </div>
  );
}



