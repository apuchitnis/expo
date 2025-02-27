import { css } from '@emotion/react';
import * as React from 'react';

import { BASE_HEADING_LEVEL, Heading, HeadingManager } from '../common/headingManager';
import DocumentationSidebarRightLink from './DocumentationSidebarRightLink';

import withHeadingManager from '~/components/page-higher-order/withHeadingManager';
import * as Constants from '~/constants/theme';

const STYLES_SIDEBAR = css`
  padding: 20px 24px 24px 24px;
  width: 280px;

  @media screen and (max-width: ${Constants.breakpoints.mobile}) {
    width: 100%;
  }
`;

const UPPER_SCROLL_LIMIT_FACTOR = 1 / 4;
const LOWER_SCROLL_LIMIT_FACTOR = 3 / 4;

const ACTIVE_ITEM_OFFSET_FACTOR = 1 / 6;

const isDynamicScrollAvailable = () => {
  if (!history?.replaceState) {
    return false;
  }

  if (window.matchMedia('(prefers-reduced-motion)').matches) {
    return false;
  }

  return true;
};

type Props = {
  maxNestingDepth?: number;
  selfRef?: React.RefObject<any>;
  contentRef?: React.RefObject<any>;
};

type PropsWithHM = Props & { headingManager: HeadingManager };

type State = {
  activeSlug: string | null;
};

class DocumentationSidebarRight extends React.Component<PropsWithHM, State> {
  static defaultProps = {
    maxNestingDepth: 4,
  };

  state = {
    activeSlug: null,
  };

  private slugScrollingTo: string | null = null;
  private activeItemRef = React.createRef<HTMLAnchorElement>();

  public handleContentScroll(contentScrollPosition: number) {
    const { headings } = this.props.headingManager;

    for (const { ref, slug } of headings) {
      if (!ref || !ref.current) {
        continue;
      }
      if (
        ref.current.offsetTop >=
          contentScrollPosition + window.innerHeight * ACTIVE_ITEM_OFFSET_FACTOR &&
        ref.current.offsetTop <= contentScrollPosition + window.innerHeight / 2
      ) {
        if (slug !== this.state.activeSlug) {
          // we can enable scrolling again
          if (slug === this.slugScrollingTo) {
            this.slugScrollingTo = null;
          }
          this.setState({ activeSlug: slug }, this.updateSelfScroll);
        }
        return;
      }
    }
  }

  render() {
    const { headings } = this.props.headingManager;

    //filter out headings nested too much
    const displayedHeadings = headings.filter(
      head => head.level <= BASE_HEADING_LEVEL + this.props.maxNestingDepth!
    );

    return (
      <nav css={STYLES_SIDEBAR} data-sidebar>
        {displayedHeadings.map(heading => {
          const isActive = heading.slug === this.state.activeSlug;
          return (
            <DocumentationSidebarRightLink
              key={heading.slug}
              heading={heading}
              onClick={e => this.handleLinkClick(e, heading)}
              isActive={isActive}
              ref={isActive ? this.activeItemRef : undefined}
              shortenCode
            />
          );
        })}
      </nav>
    );
  }

  /**
   * Scrolls sidebar to keep active element always visible
   */
  private updateSelfScroll = () => {
    const selfScroll = this.props.selfRef?.current?.getScrollRef().current;
    const activeItemPos = this.activeItemRef.current?.offsetTop;

    if (!selfScroll || !activeItemPos || this.slugScrollingTo) {
      return;
    }

    const { scrollTop } = selfScroll;
    const upperThreshold = window.innerHeight * UPPER_SCROLL_LIMIT_FACTOR;
    const lowerThreshold = window.innerHeight * LOWER_SCROLL_LIMIT_FACTOR;

    if (activeItemPos < scrollTop + upperThreshold) {
      selfScroll.scrollTo({ behavior: 'auto', top: Math.max(0, activeItemPos - upperThreshold) });
    } else if (activeItemPos > scrollTop + lowerThreshold) {
      selfScroll.scrollTo({ behavior: 'auto', top: activeItemPos - lowerThreshold });
    }
  };

  private handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, heading: Heading) => {
    if (!isDynamicScrollAvailable()) {
      return;
    }

    event.preventDefault();
    const { title, slug, ref } = heading;

    // disable sidebar scrolling until we reach that slug
    this.slugScrollingTo = slug;

    this.props.contentRef?.current?.getScrollRef().current?.scrollTo({
      behavior: 'smooth',
      top: ref.current?.offsetTop - window.innerHeight * ACTIVE_ITEM_OFFSET_FACTOR,
    });
    history.replaceState(history.state, title, '#' + slug);
  };
}

const SidebarWithHeadingManager = withHeadingManager(function SidebarWithHeadingManager({
  reactRef,
  ...props
}) {
  return <DocumentationSidebarRight {...props} ref={reactRef} />;
}) as React.FC<Props & { reactRef: React.Ref<DocumentationSidebarRight> }>;

SidebarWithHeadingManager.displayName = 'SidebarRightRefWrapper';

const SidebarForwardRef = React.forwardRef<DocumentationSidebarRight, Props>((props, ref) => (
  <SidebarWithHeadingManager {...props} reactRef={ref} />
));

export type SidebarRightComponentType = DocumentationSidebarRight;

export default SidebarForwardRef;
