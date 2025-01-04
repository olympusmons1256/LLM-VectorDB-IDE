import ChatApp from '@/components/ChatApp';
import FileSystem from '@/components/FileSystem/FileSystem';

export default function Page() {
  return (
    <main className="min-h-screen p-4">
      <div className="flex gap-4 justify-center">
        <FileSystem />
        <ChatApp />
      </div>
    </main>
  );
}