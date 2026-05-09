export function VotingClosedScreen({ eventName }: { eventName: string }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">{eventName}</h1>
      <p className="mt-6 text-2xl text-white/70 sm:text-3xl">Voting is currently closed.</p>
      <p className="mt-2 text-base text-white/40 sm:text-lg">Please wait for staff to open voting.</p>
    </div>
  );
}
