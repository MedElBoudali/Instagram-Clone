import { useEffect, useState } from "react";
import throttle from "lodash/throttle";
import PropTypes from "prop-types";

const useSticky = (top: number) => {
	const [sticky, setSticky] = useState<boolean>(false);

	useEffect(() => {
		const onScrollFunc = throttle(() => {
			window.scrollY >= top ? setSticky(true) : setSticky(false);
		}, 100);
		window.addEventListener("scroll", onScrollFunc);
		return () => window.removeEventListener("scroll", onScrollFunc);
	}, [top]);
	return sticky;
};

useSticky.propTypes = {
	top: PropTypes.number.isRequired
};

export default useSticky;
