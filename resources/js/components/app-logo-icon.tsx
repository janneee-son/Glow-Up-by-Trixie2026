import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
  <img 
    src="/acc-logo.png" 
    alt="ACC Logo" 
    className="w-full h-full object-cover" 
  />
</div>
    )
}
