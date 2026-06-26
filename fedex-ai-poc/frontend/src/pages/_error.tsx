function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h2>{statusCode ? `${statusCode} — Server error` : "An error occurred"}</h2>
      <a href="/chat" style={{ color: "#6366f1" }}>Go to home</a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
