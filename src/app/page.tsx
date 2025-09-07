import ClientGameWrapper from '@/components/ClientGameWrapper';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex justify-center items-start min-h-screen p-4 md:p-6 lg:p-10 relative">
      <main className="flex flex-col gap-6 md:gap-10 items-center w-full max-w-screen-xl">
        <div className="flex items-center justify-center gap-4 md:gap-6 select-none">
          <Image
            src="dagger.png"
            alt="Backstabber dagger"
            width={126}
            height={126}
            priority
            className="w-[126px] h-[126px] object-contain drop-shadow-[0_0_10px_rgba(255,77,57,0.35)]"
          />
          <h1 className="game-title text-5xl md:text-6xl tracking-wide text-center leading-none">
            Backstabber
          </h1>
        </div>
        <ClientGameWrapper />
      </main>
    </div>
  );
}
