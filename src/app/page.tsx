import ClientGameWrapper from '@/components/ClientGameWrapper';

export default function Home() {
  return (
    <div className="flex justify-center items-start min-h-screen p-2 md:p-4 lg:p-8 font-[family-name:var(--font-geist-sans)] relative">
      <main className="flex flex-col gap-4 md:gap-8 items-center w-full max-w-screen-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-center">Simple AI Game</h1>
        <ClientGameWrapper />
      </main>
    </div>
  );
}
