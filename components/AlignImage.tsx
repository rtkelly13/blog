import type React from 'react';

interface AlignImageProps {
  children: React.ReactNode;
}
const AlignImage = ({ children }: AlignImageProps) => (
  <div className="flex flex-wrap -mx-2 overflow-hidden xl:-mx-2">
    <div className="my-1 px-2 w-full overflow-hidden xl:my-1 xl:px-2 xl:w-1/2">
      {children}
    </div>
  </div>
);

export default AlignImage;
