import { useParams } from "react-router-dom";

function RoomPage() {
  const { shareLink } = useParams();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center flex-col gap-4">
      <h1 className="text-2xl font-normal text-black">Room: {shareLink}</h1>
      <p className="text-gray-500 text-sm">
        Room page — Monaco Editor coming next!
      </p>
    </div>
  );
}

export default RoomPage;
