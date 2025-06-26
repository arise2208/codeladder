import React from 'react';
import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 mesh-gradient"></div>
        <div className="hero-pattern absolute inset-0"></div>
        <div className="relative max-w-7xl mx-auto container-padding section-padding">
          <div className="text-center">
            {/* Main Hero Content */}
            <div className="mb-8 relative animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&h=120&fit=crop&crop=center"
                alt="CodeLadder"
                className="relative w-24 h-24 mx-auto rounded-2xl shadow-2xl object-cover border-4 border-white transform hover:scale-110 transition-all duration-500"
              />
            </div>
            <h1 className="section-header animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Level Up With <span className="text-gradient block mt-2">CodeLadder</span>
            </h1>
            <p className="section-subheader mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Join thousands of competitive programmers using our platform to collaborate, upsolve, and share insights.
              <span className="font-semibold text-gray-900"> Practice smarter, upsolve faster, achieve more.</span>
            </p>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/register" className="btn-primary px-8 py-3 text-lg rounded-full shadow-lg">
                Get Started
              </Link>
              <Link to="/ladders" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Explore Ladders
              </Link>
              <Link to="/contest" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Codeforces Upsolver
              </Link>
              <Link to="/codechef" className="btn-secondary px-8 py-3 text-lg rounded-full">
                CodeChef Upsolver
              </Link>
              <Link to="/leetcode" className="btn-secondary px-8 py-3 text-lg rounded-full">
                Leetcode Upsolver
              </Link>
            </div>
          </div>
        </div>
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full animate-float-gentle"></div>
        <div className="absolute top-40 right-20 w-12 h-12 bg-purple-200/30 rounded-full animate-float-gentle" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-indigo-200/30 rounded-full animate-float-gentle" style={{ animationDelay: '2s' }}></div>
      </section>

      {/* Welcome Section */}
      <section className="section-padding bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto text-center container-padding">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-gradient">CodeLadder</span>
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            This project is a prototype of what I call the <strong>Dynamic Ladder</strong>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            Ever wanted to share a list of coding questions with friends or collaborate on building a problem ladder? 
            While tools like Google Sheets or Docs can be used, they often feel clunky and repetitive.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            <strong>CodeLadder</strong> makes collaboration easy—track questions, avoid duplicates, and enjoy a much better UI experience. 
            Whether you're studying solo or with a team, this tool helps you organize, share, and solve more efficiently.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-4 text-yellow-800 mb-4">
            <strong>Please note:</strong> Some operations might take a couple of seconds to respond. We recommend waiting 1–2 seconds before attempting another update.
          </div>
          <p className="text-gray-500 mt-6">
            For any bugs, issues, or suggestions, feel free to reach out at <a className="underline" href="mailto:methodactorme@gmail.com">methodactorme@gmail.com</a>.
          </p>
          <p className="mt-4 font-semibold text-blue-700">Happy Coding! 🚀</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-gradient-to-r from-gray-50 to-blue-50 text-center border-t border-gray-100 mt-auto">
        <div className="text-gray-700 text-sm">
          made with <span className="text-red-500">♥</span> by Deepanshu Soni - IIIT Allahabad
        </div>
      </footer>
    </div>
  );
}

export default Home;