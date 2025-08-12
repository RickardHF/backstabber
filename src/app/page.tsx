import ClientGameWrapper from '@/components/ClientGameWrapper';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex justify-center items-start min-h-screen p-2 md:p-4 lg:p-8 font-[family-name:var(--font-geist-sans)] relative">
      <main className="flex flex-col gap-4 md:gap-8 items-center w-full max-w-screen-xl">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          <Image
            src="/dagger.png"
            alt="Backstabber dagger"
            width={126}
            height={126}
            priority
            className="select-none w-[126px] h-[126px] object-contain drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]"
          />
          <h1 className="font-[family-name:var(--font-medieval-display)] text-5xl md:text-6xl tracking-wide text-center leading-none">
            Backstabber
          </h1>
        </div>
        <ClientGameWrapper />
      </main>
    </div>
  );
}
