import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getNeynarUser } from "~/lib/neynar";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  const user = fid ? await getNeynarUser(Number(fid)) : null;

  return new ImageResponse(
    (
      <div tw="flex h-full w-full flex-col justify-center items-center relative bg-primary">
        {user?.pfp_url && (
          <div tw="flex w-96 h-96 rounded-full overflow-hidden mb-8 border-8 border-white">
            <img src={user.pfp_url} alt="Profile" tw="w-full h-full object-cover" />
          </div>
        )}
        <img src="/icon.png" alt="Icon" className="mx-auto mb-4 w-24 h-24" />
        <p tw="text-5xl mt-4 text-white opacity-80">Experience the power of TRIBE!</p>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}