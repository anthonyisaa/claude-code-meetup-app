export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <h1 className="font-mono text-2xl font-bold mb-4">Profile</h1>
      <p className="text-text-secondary">Viewing profile {id}</p>
    </div>
  );
}
