interface Props {
  title: string;
}

export default function Placeholder({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
        style={{ backgroundColor: '#35C0A3' }}
      >
        {title.charAt(0)}
      </div>
      <h2 className="text-[20px] font-semibold text-gray-700">{title}</h2>
      <p className="text-[14px] text-gray-400">This page is under construction.</p>
    </div>
  );
}
