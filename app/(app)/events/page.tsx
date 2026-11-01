import Link from "next/link";
import { getHostEvents } from "@/lib/events";
import { verifyUser } from "@/lib/auth";

export default async function EventsPage() {
  try {
    const profile = await verifyUser();
    const events = await getHostEvents(profile.id);
    return (
      <div className="w-full ">
        <ul className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="block py-3 text-xl hover:bg-neutral-50"
              >
                <div className="flex justify-around gap-2.5">
                  <span>{event.name}</span>
                  <div className="flex flex-col">
                    <span>
                      {new Date(event.startTime).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "Asia/Manila",
                      })}
                    </span>
                    <span>
                      {new Date(event.startTime).toLocaleTimeString("en-PH", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Manila",
                      })}{" "}
                      -{" "}
                      {new Date(event.endTime).toLocaleTimeString("en-PH", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Manila",
                      })}
                    </span>
                  </div>
                  <span>{event.location}</span>
                  <span>{event.capacity}</span>
                  <span>{event.status}</span>
                  <span>PHP {event.totalEarned.toFixed(2)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  } catch (e) {
    console.error("EventsPage failed:", e);
    throw e;
  }
}
