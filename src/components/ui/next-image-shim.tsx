import * as React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  fill?: boolean;
};

export default function Image({ priority: _p, fill, style, ...rest }: Props) {
  const s = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;
  return <img {...rest} style={s as React.CSSProperties} />;
}
