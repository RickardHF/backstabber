import ClientGameWrapper from '@/components/ClientGameWrapper';

export default function Home() {
  return (
    <div className="flex justify-center items-center min-h-screen p-8 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
      <main className="flex flex-col gap-[32px] items-center w-full max-w-screen-lg">
        <h1 className="text-3xl font-bold">Simple AI Game</h1>
        <ClientGameWrapper />
      </main>
    </div>
  );
}
