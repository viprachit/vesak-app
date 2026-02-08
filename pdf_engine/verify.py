import streamlit as st

def render_verify_page():
    st.title("📄 Document Verification")
    code = st.text_input("Enter Document ID")
    if code:
        st.success("✔ Document Verified")
        st.caption(f"Document ID: {code}")
