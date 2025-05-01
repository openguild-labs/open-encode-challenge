"use client";

import CreateForm from "./create-form";
import ScheduleCard from "./schedule-card";

export default function Vesting() {
  return (
    <div className="flex flex-col gap-10 w-full">
      <CreateForm />
      <ScheduleCard />
    </div>
  );
}