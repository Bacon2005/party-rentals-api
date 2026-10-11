"use client";

type SummaryBoxProps = {
  title: string;
  stat: string;
  color: string;
  children: React.ReactNode;
};

export function SummaryBox({ title, children, stat, color }: SummaryBoxProps) {
  return (
    <div className="flex flex-row gap-4 border-2 p-4 rounded-xl ">
      <div className={`${color} p-3 rounded-xl`}>{children}</div>
      <div className="box">
        <h2>{title}</h2>
        <h1 className="font-bold">{stat}</h1>
      </div>
    </div>
  );
}
