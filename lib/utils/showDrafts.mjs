export const show_drafts = () => {
  return (
    process.env.NODE_ENV === 'development' || process.env.SHOW_DRAFTS === 'true'
  );
};
